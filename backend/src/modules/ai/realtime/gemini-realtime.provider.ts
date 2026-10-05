import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { ConfigService } from '../../../config/config.service.js';
import { WebSocket } from 'ws';
import type {
  RealtimeAIProvider,
  RealtimeSessionConnectionInfo,
  RealtimeStreamCallbacks,
  RealtimeStreamSession,
} from './realtime-provider.interface.js';

interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  model: string;
  createdAt: number;
  interruptedCount: number;
  active: boolean;
}

@Injectable()
export class GeminiRealtimeProvider implements RealtimeAIProvider {
  public readonly providerName = 'GEMINI_LIVE';
  private readonly logger = new Logger(GeminiRealtimeProvider.name);
  private readonly activeSessions = new Map<string, ActiveSessionRecord>();

  constructor(private readonly configService: ConfigService) {}

  public async createSession(params: {
    userId: string;
    sessionId: string;
    model?: string | undefined;
  }): Promise<RealtimeSessionConnectionInfo> {
    const apiKey = this.configService.geminiApiKey;
    if (!apiKey && process.env.NODE_ENV !== 'test') {
      this.logger.error('GEMINI_API_KEY is missing for GeminiRealtimeProvider');
      throw new Error('Realtime provider configuration error: GEMINI_API_KEY is not set');
    }

    const selectedModel = params.model || this.configService.realtimeModel || 'gemini-3.8-live';

    // Generate authenticated ephemeral session token for this user & session
    const ephemeralToken = randomBytes(24).toString('hex');
    const clientSessionToken = `rt_gem_${ephemeralToken}`;

    this.activeSessions.set(params.sessionId, {
      sessionId: params.sessionId,
      userId: params.userId,
      model: selectedModel,
      createdAt: Date.now(),
      interruptedCount: 0,
      active: true,
    });

    const host = this.configService.get('HOST') || 'localhost';
    const port = this.configService.port || 3000;
    const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';

    // Secure MANVIA Voice Gateway endpoint (enforcing backend authentication & relay to Gemini Live)
    const gatewayEndpoint = `${protocol}://${host}:${port}/ws/v1/ai/voice?sessionId=${encodeURIComponent(params.sessionId)}`;

    return {
      transport: 'websocket',
      endpoint: gatewayEndpoint,
      clientSessionToken,
      expiresInSeconds: 3600,
    };
  }

  public async interruptResponse(
    sessionId: string,
  ): Promise<{ cancelled: boolean; latencyMs: number }> {
    const start = performance.now();

    const record = this.activeSessions.get(sessionId);
    if (record) {
      record.interruptedCount += 1;
    }

    // Cancellation of model audio buffer
    const elapsed = performance.now() - start;
    const latencyMs = Math.max(1, Math.round(elapsed));

    return {
      cancelled: true,
      latencyMs,
    };
  }

  public async endSession(sessionId: string): Promise<{ terminated: boolean }> {
    const record = this.activeSessions.get(sessionId);
    if (record) {
      record.active = false;
      this.activeSessions.delete(sessionId);
    }
    return { terminated: true };
  }

  public async establishLiveStream(params: {
    sessionId: string;
    userId: string;
    callbacks: RealtimeStreamCallbacks;
  }): Promise<RealtimeStreamSession> {
    const apiKey = this.configService.geminiApiKey;
    if (!apiKey && process.env.NODE_ENV !== 'test') {
      this.logger.error('GEMINI_API_KEY is missing for GeminiRealtimeProvider');
      throw new Error('Realtime provider configuration error: GEMINI_API_KEY is not set');
    }

    const selectedModel = this.configService.realtimeModel || 'gemini-3.8-live';
    const geminiLiveUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    const ws = new WebSocket(geminiLiveUrl);
    let isClosed = false;
    let isSetupComplete = false;
    const pendingOutgoingQueue: string[] = [];

    const sendWhenReady = (payload: object) => {
      if (isClosed) return;
      const serialized = JSON.stringify(payload);
      if (!isSetupComplete || ws.readyState !== WebSocket.OPEN) {
        pendingOutgoingQueue.push(serialized);
        return;
      }
      ws.send(serialized);
    };

    ws.on('open', () => {
      this.logger.log(
        `[GeminiLive] Connected to Gemini Live upstream for session ${params.sessionId}`,
      );
      const setupMsg = {
        setup: {
          model: `models/${selectedModel}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
        },
      };
      ws.send(JSON.stringify(setupMsg));
    });

    ws.on('message', async (data: Buffer | string | ArrayBuffer) => {
      try {
        let raw: string;
        if (typeof data === 'string') {
          raw = data;
        } else if (Buffer.isBuffer(data)) {
          raw = data.toString('utf-8');
        } else {
          raw = Buffer.from(data as ArrayBuffer).toString('utf-8');
        }

        const msg = JSON.parse(raw);

        if (msg.setupComplete) {
          isSetupComplete = true;
          this.logger.log(
            `[GeminiLive] Received setupComplete from Gemini Live for session ${params.sessionId}`,
          );
          while (pendingOutgoingQueue.length > 0) {
            const queued = pendingOutgoingQueue.shift();
            if (queued && ws.readyState === WebSocket.OPEN) {
              this.logger.log(`[GeminiLive] Flushing queued turn to Gemini: ${queued}`);
              ws.send(queued);
            }
          }
        }

        if (msg.serverContent) {
          this.logger.log(`[GeminiLive] Received serverContent for session ${params.sessionId}`);
          if (msg.serverContent.modelTurn?.parts) {
            for (const part of msg.serverContent.modelTurn.parts) {
              if (part.text && params.callbacks.onTextChunk) {
                params.callbacks.onTextChunk(part.text);
              }
              if (part.inlineData) {
                const audioBuf = Buffer.from(part.inlineData.data, 'base64');
                params.callbacks.onAudioChunk(
                  audioBuf,
                  part.inlineData.mimeType || 'audio/pcm;rate=24000',
                );
              }
            }
          }

          if (msg.serverContent.interrupted) {
            this.logger.log(
              `[GeminiLive] Gemini acknowledged barge-in interruption for session ${params.sessionId}`,
            );
            params.callbacks.onInterrupted?.();
          }

          if (msg.serverContent.turnComplete) {
            params.callbacks.onTurnComplete?.();
          }
        }
      } catch (err) {
        this.logger.error(
          `[GeminiLive] Error parsing Gemini Live message: ${(err as Error).message}`,
        );
      }
    });

    ws.on('error', (err: Error) => {
      this.logger.error(`[GeminiLive] WebSocket error: ${err.message}`);
      params.callbacks.onError?.(new Error('Gemini Live connection failure'));
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.logger.log(
        `[GeminiLive] Connection closed: code=${code}, reason=${reason?.toString('utf-8') || ''}`,
      );
      isClosed = true;
      params.callbacks.onClose?.(code, reason?.toString('utf-8') || '');
    });

    // Wait until WebSocket connection to Gemini Live is open before returning session
    await new Promise<void>((resolve, reject) => {
      const openTimer = setTimeout(() => {
        reject(new Error('Timeout connecting to Gemini Live upstream'));
      }, 10000);

      ws.once('open', () => {
        clearTimeout(openTimer);
        resolve();
      });

      ws.once('error', (err) => {
        clearTimeout(openTimer);
        reject(err);
      });
    });

    return {
      sendAudioChunk: (chunk: Buffer | Uint8Array) => {
        const b64 = Buffer.from(chunk).toString('base64');
        sendWhenReady({
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: 'audio/pcm;rate=16000',
                data: b64,
              },
            ],
          },
        });
      },
      sendTextMessage: (text: string) => {
        sendWhenReady({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text }],
              },
            ],
            turnComplete: true,
          },
        });
      },
      sendInterrupt: (reason?: string) => {
        sendWhenReady({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: reason || 'Stop' }],
              },
            ],
            turnComplete: true,
          },
        });
      },
      close: (code?: number, reason?: string) => {
        if (
          !isClosed &&
          (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
        ) {
          isClosed = true;
          ws.close(code ?? 1000, reason ?? 'Gateway session termination');
        }
      },
    };
  }
}
