import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  type RealtimeAIProvider,
  type RealtimeSessionConnectionInfo,
  type RealtimeStreamCallbacks,
  type RealtimeStreamSession,
} from './realtime-provider.interface.js';

@Injectable()
export class MockRealtimeProvider implements RealtimeAIProvider {
  public readonly providerName = 'MOCK_REALTIME_PROVIDER';
  public async createSession(params: {
    userId: string;
    sessionId: string;
    model?: string | undefined;
  }): Promise<RealtimeSessionConnectionInfo> {
    const ephemeralToken = randomBytes(24).toString('hex');
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';

    return {
      transport: 'websocket',
      endpoint: `${protocol}://${host}:${port}/ws/v1/ai/voice?sessionId=${encodeURIComponent(params.sessionId)}`,
      clientSessionToken: `rt_tok_${ephemeralToken}`,
      expiresInSeconds: 3600,
    };
  }

  public async interruptResponse(
    _sessionId: string,
  ): Promise<{ cancelled: boolean; latencyMs: number }> {
    // Deterministic mock barge-in cancellation within 15ms
    return {
      cancelled: true,
      latencyMs: 15,
    };
  }

  public async endSession(_sessionId: string): Promise<{ terminated: boolean }> {
    return { terminated: true };
  }

  public async establishLiveStream(params: {
    sessionId: string;
    userId: string;
    callbacks: RealtimeStreamCallbacks;
  }): Promise<RealtimeStreamSession> {
    let closed = false;
    return {
      sendAudioChunk: (_chunk: Buffer | Uint8Array) => {
        if (closed) return;
        setTimeout(() => {
          if (!closed) {
            params.callbacks.onAudioChunk(
              Buffer.from([0x00, 0x01, 0x02, 0x03]),
              'audio/pcm;rate=24000',
            );
          }
        }, 10);
      },
      sendTextMessage: (text: string) => {
        if (closed) return;
        setTimeout(() => {
          if (!closed) {
            params.callbacks.onTextChunk?.(`Mock assistant echo: ${text}`);
            params.callbacks.onAudioChunk(
              Buffer.from([0x00, 0x01, 0x02, 0x03]),
              'audio/pcm;rate=24000',
            );
            params.callbacks.onTurnComplete?.();
          }
        }, 10);
      },
      sendInterrupt: () => {
        if (closed) return;
        setTimeout(() => {
          if (!closed) {
            params.callbacks.onInterrupted?.();
          }
        }, 10);
      },
      close: () => {
        closed = true;
        params.callbacks.onClose?.(1000, 'Mock stream closed');
      },
    };
  }
}
