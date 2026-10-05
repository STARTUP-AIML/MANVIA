// ==============================================================================
// MANVIA — AI Realtime Voice WebSocket Gateway
// ==============================================================================
// Phase 17 / M6: Bidirectional Voice Avatar Gateway (/ws/v1/ai/voice)
// Orchestrates Browser/Mobile Client <-> MANVIA Voice Gateway <-> Gemini Live
// ==============================================================================

import { Inject, Injectable, Logger, type OnModuleInit, Optional } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { WebSocket, type RawData } from 'ws';
import { PrismaService } from '../../../database/prisma.service.js';
import { TokenService } from '../../auth/services/token.service.js';
import { SessionService } from '../../auth/services/session.service.js';
import { AIRealtimeService } from './ai-realtime.service.js';
import { AIAuditService } from '../services/ai-audit.service.js';
import { REALTIME_AI_PROVIDER } from '../providers/provider.tokens.js';
import type { RealtimeAIProvider, RealtimeStreamSession } from './realtime-provider.interface.js';
import { AIRealtimeState } from './realtime.enums.js';
import type { AuthenticatedUser } from '../../auth/auth.interface.js';

const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024; // 2 MB maximum frame size limit

@Injectable()
export class AIVoiceGateway implements OnModuleInit {
  private readonly logger = new Logger(AIVoiceGateway.name);
  private isRegistered = false;
  private readonly activeSockets = new Map<string, WebSocket>();

  constructor(
    @Optional()
    private readonly adapterHost: HttpAdapterHost,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly realtimeService: AIRealtimeService,
    private readonly auditService: AIAuditService,
    @Inject(REALTIME_AI_PROVIDER)
    private readonly provider: RealtimeAIProvider,
  ) {}

  public onModuleInit(): void {
    if (this.adapterHost?.httpAdapter) {
      const fastify = this.adapterHost.httpAdapter.getInstance<FastifyInstance>();
      this.registerGateway(fastify);
    }
  }

  /**
   * Registers the WebSocket route /ws/v1/ai/voice onto Fastify.
   * Safe to call multiple times (idempotent).
   */
  public registerGateway(fastify: FastifyInstance): void {
    if (this.isRegistered || !fastify) {
      return;
    }

    try {
      fastify.get(
        '/ws/v1/ai/voice',
        { websocket: true },
        (socket: WebSocket, request: FastifyRequest) => {
          this.handleConnection(socket, request).catch((err) => {
            this.logger.error(
              `Error handling voice websocket connection: ${(err as Error).message}`,
            );
            this.sendSafeError(socket, 1011, 'Internal voice gateway error');
          });
        },
      );
      this.isRegistered = true;
      this.logger.log('[MANVIA] Realtime Voice Gateway registered at /ws/v1/ai/voice');
    } catch (err) {
      this.logger.error(`Failed to register /ws/v1/ai/voice gateway: ${(err as Error).message}`);
    }
  }

  /**
   * Authenticates caller, validates session ownership, binds upstream Gemini Live,
   * and relays bidirectional audio and control messages.
   */
  public async handleConnection(socket: WebSocket, request: FastifyRequest): Promise<void> {
    // Buffer early messages until connection handshake is fully verified and READY is sent
    const messageQueue: Array<{ data: RawData; isBinary: boolean }> = [];
    let isReady = false;
    let upstreamSession: RealtimeStreamSession | null = null;
    let resolvedUser: AuthenticatedUser | null = null;
    let publicSessionId = '';

    const processMessage = async (data: RawData, isBinary: boolean) => {
      try {
        const frameLength = Buffer.isBuffer(data)
          ? data.length
          : Array.isArray(data)
            ? data.reduce((sum, b) => sum + b.length, 0)
            : typeof data === 'string'
              ? Buffer.byteLength(data)
              : ((data as ArrayBuffer).byteLength ?? 0);

        // Rate & Size limit check (reject oversized frame)
        if (frameLength > MAX_PAYLOAD_BYTES) {
          this.sendSafeError(socket, 1009, 'Message too big: Frame exceeds size limit');
          return;
        }

        // Binary PCM frame relay
        if (isBinary) {
          const buf = Buffer.isBuffer(data)
            ? data
            : Array.isArray(data)
              ? Buffer.concat(data)
              : Buffer.from(data as ArrayBuffer);
          upstreamSession?.sendAudioChunk(buf);
          return;
        }

        // Control / Text JSON message
        const text = Buffer.isBuffer(data)
          ? data.toString('utf-8')
          : Array.isArray(data)
            ? Buffer.concat(data).toString('utf-8')
            : Buffer.from(data as ArrayBuffer).toString('utf-8');
        let message: Record<string, unknown>;
        try {
          message = JSON.parse(text);
        } catch {
          socket.send(JSON.stringify({ type: 'ERROR', error: 'Malformed JSON control message' }));
          return;
        }

        const msgType = String(message.type || message.event || '').toUpperCase();

        switch (msgType) {
          case 'AUDIO':
          case 'AUDIO.CHUNK': {
            if (typeof message.data === 'string') {
              const buf = Buffer.from(message.data, 'base64');
              upstreamSession?.sendAudioChunk(buf);
            }
            break;
          }
          case 'INTERRUPT':
          case 'AUDIO.INTERRUPT': {
            // Forward barge-in interruption to Gemini
            upstreamSession?.sendInterrupt();
            if (resolvedUser && publicSessionId) {
              try {
                const current = await this.prisma.aIRealtimeSession.findFirst({
                  where: { publicSessionId },
                  select: { id: true, state: true },
                });
                if (
                  current?.state === AIRealtimeState.SPEAKING ||
                  current?.state === AIRealtimeState.PROCESSING
                ) {
                  await this.realtimeService.interruptSession(resolvedUser.id, publicSessionId);
                } else if (current) {
                  await this.prisma.aIRealtimeSession.update({
                    where: { id: current.id },
                    data: { interruptionCount: { increment: 1 }, updatedAt: new Date() },
                  });
                }
              } catch {
                // ignore state transition constraint error
              }
            }
            socket.send(
              JSON.stringify({
                type: 'INTERRUPTED',
                event: 'audio.interrupt',
                interrupted: true,
              }),
            );
            break;
          }
          case 'PING': {
            socket.send(JSON.stringify({ type: 'PONG', event: 'pong' }));
            break;
          }
          case 'TEXT':
          case 'CLIENT.TURN': {
            if (typeof message.text === 'string') {
              upstreamSession?.sendTextMessage(message.text);
            }
            break;
          }
          case 'START':
          case 'SESSION.INIT': {
            socket.send(
              JSON.stringify({
                type: 'READY',
                event: 'session.ready',
                sessionId: publicSessionId,
                state: AIRealtimeState.LISTENING,
              }),
            );
            break;
          }
          case 'STOP': {
            if (publicSessionId) {
              await this.prisma.aIRealtimeSession
                .updateMany({
                  where: { publicSessionId },
                  data: { state: AIRealtimeState.LISTENING, updatedAt: new Date() },
                })
                .catch(() => {});
            }
            break;
          }
          case 'END':
          case 'SESSION.END': {
            if (resolvedUser && publicSessionId) {
              await this.realtimeService
                .endSession(resolvedUser.id, publicSessionId)
                .catch(() => {});
            }
            upstreamSession?.close();
            socket.close(1000, 'Session ended by client');
            break;
          }
          default: {
            socket.send(JSON.stringify({ type: 'ACK', event: msgType }));
            break;
          }
        }
      } catch (err) {
        this.logger.error(`Error processing message: ${(err as Error).message}`);
        socket.send(JSON.stringify({ type: 'ERROR', error: 'Internal message relay error' }));
      }
    };

    // Attach message listener immediately to buffer or process
    socket.on('message', async (data: RawData, isBinary: boolean) => {
      if (!isReady) {
        messageQueue.push({ data, isBinary });
        return;
      }
      await processMessage(data, isBinary);
    });

    const query = (request.query || {}) as Record<string, string | undefined>;
    const sessionId =
      query.sessionId ||
      query.session_id ||
      (request.headers['x-session-id'] as string | undefined);

    // 1. Resolve and authenticate user via cryptographic JWT and active session
    const authUser = await this.resolveAuthenticatedUser(request);
    if (!authUser) {
      this.sendSafeError(
        socket,
        1008,
        'Unauthorized: Invalid or missing authentication credentials',
      );
      return;
    }
    resolvedUser = authUser;

    // 2. Validate session identifier presence
    if (!sessionId) {
      this.sendSafeError(socket, 1008, 'Bad Request: Missing sessionId parameter');
      return;
    }

    // 3. Look up AIRealtimeSession in database
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionId,
    );
    const realtimeSession = await this.prisma.aIRealtimeSession.findFirst({
      where: isUuid
        ? { OR: [{ id: sessionId }, { publicSessionId: sessionId }] }
        : { publicSessionId: sessionId },
    });

    if (!realtimeSession) {
      this.sendSafeError(socket, 1008, 'Not Found: Realtime session not found');
      return;
    }
    publicSessionId = realtimeSession.publicSessionId;

    // 4. Verify strict session ownership (request.user -> session.userId)
    if (realtimeSession.userId !== authUser.id) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: authUser.id,
        role: 'USER',
        action: 'AI_ACCESS_DENIED',
        resource: `AI_REALTIME_SESSION:${realtimeSession.publicSessionId}`,
        metadata: { reason: 'Cross-user realtime session access denied' },
      });
      this.sendSafeError(socket, 1008, 'Forbidden: You do not own this realtime session');
      return;
    }

    // 5. Verify session validity and expiration
    if (realtimeSession.expiresAt < new Date()) {
      this.sendSafeError(socket, 1008, 'Forbidden: Realtime session has expired');
      return;
    }

    if (realtimeSession.state === AIRealtimeState.ENDED) {
      this.sendSafeError(socket, 1008, 'Forbidden: Realtime session has ended');
      return;
    }

    // Optional: verify clientSessionToken if provided
    const clientSessionToken = query.clientSessionToken || query.token;
    const expectedToken = (realtimeSession.connectionInfo as Record<string, unknown> | null)
      ?.clientSessionToken;
    if (
      typeof clientSessionToken === 'string' &&
      typeof expectedToken === 'string' &&
      clientSessionToken.startsWith('rt_') &&
      clientSessionToken !== expectedToken
    ) {
      this.sendSafeError(socket, 1008, 'Forbidden: Invalid clientSessionToken');
      return;
    }

    // 6. Establish upstream Gemini Live session through provider abstraction
    try {
      if (typeof this.provider.establishLiveStream === 'function') {
        upstreamSession = await this.provider.establishLiveStream({
          sessionId: realtimeSession.publicSessionId,
          userId: authUser.id,
          callbacks: {
            onAudioChunk: (chunk: Buffer, _mimeType: string) => {
              if (socket.readyState === WebSocket.OPEN) {
                // Relay binary audio frame directly to client
                socket.send(chunk, { binary: true });
              }
            },
            onTextChunk: (text: string) => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    type: 'TEXT',
                    event: 'transcript.interim',
                    text,
                  }),
                );
              }
            },
            onInterrupted: () => {
              if (socket.readyState === WebSocket.OPEN) {
                // Upstream barge-in confirmed
                socket.send(
                  JSON.stringify({
                    type: 'INTERRUPTED',
                    event: 'audio.interrupt',
                    interrupted: true,
                  }),
                );
              }
            },
            onTurnComplete: () => {
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    type: 'TURN_COMPLETE',
                    event: 'turn.complete',
                  }),
                );
              }
            },
            onError: (err: Error) => {
              this.logger.error(
                `Upstream provider error for session ${realtimeSession.publicSessionId}: ${err.message}`,
              );
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(
                  JSON.stringify({
                    type: 'ERROR',
                    event: 'error',
                    error: 'Upstream provider connection failure',
                  }),
                );
              }
            },
            onClose: (code, reason) => {
              this.logger.log(
                `Upstream provider stream closed for session ${realtimeSession.publicSessionId}: ${code} - ${reason}`,
              );
            },
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Failed to establish upstream session for ${realtimeSession.publicSessionId}: ${(err as Error).message}`,
      );
      this.sendSafeError(socket, 1011, 'Upstream provider allocation failure');
      return;
    }

    // 7. Transition session state to LISTENING
    if (
      realtimeSession.state === AIRealtimeState.IDLE ||
      realtimeSession.state === AIRealtimeState.RECONNECTING
    ) {
      await this.prisma.aIRealtimeSession.update({
        where: { id: realtimeSession.id },
        data: { state: AIRealtimeState.LISTENING, updatedAt: new Date() },
      });
    }

    this.auditService.logEvent({
      event: 'REALTIME_WEBSOCKET_CONNECTED',
      actorId: authUser.id,
      role: 'USER',
      action: 'REALTIME_WEBSOCKET_CONNECTED',
      resource: `AI_REALTIME_SESSION:${realtimeSession.publicSessionId}`,
      metadata: { transport: 'websocket' },
    });

    this.activeSockets.set(realtimeSession.publicSessionId, socket);

    // Send READY handshake to client
    socket.send(
      JSON.stringify({
        type: 'READY',
        event: 'session.ready',
        sessionId: realtimeSession.publicSessionId,
        state: AIRealtimeState.LISTENING,
      }),
    );

    // Mark as ready and drain buffered messages
    isReady = true;
    while (messageQueue.length > 0) {
      const buffered = messageQueue.shift();
      if (buffered) {
        await processMessage(buffered.data, buffered.isBinary);
      }
    }

    // 8. Handle socket disconnect and resource cleanup
    socket.on('close', async (code: number, reason: Buffer) => {
      this.activeSockets.delete(realtimeSession.publicSessionId);
      try {
        upstreamSession?.close();
      } catch {
        // ignore
      }

      this.auditService.logEvent({
        event: 'REALTIME_WEBSOCKET_DISCONNECTED',
        actorId: authUser.id,
        role: 'USER',
        action: 'REALTIME_WEBSOCKET_DISCONNECTED',
        resource: `AI_REALTIME_SESSION:${realtimeSession.publicSessionId}`,
        metadata: { closeCode: code, reason: reason?.toString('utf-8') || '' },
      });
    });
  }

  /**
   * Cryptographically verifies the bearer token from authorization header or query parameters.
   * Resolves the trusted active user context, or returns null if unauthenticated.
   */
  private async resolveAuthenticatedUser(
    request: FastifyRequest,
  ): Promise<AuthenticatedUser | null> {
    const query = (request.query || {}) as Record<string, string | undefined>;
    let token = query.token;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      return null;
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      const { isValid, session } = await this.sessionService.validateSession(payload.sessionId);
      if (!isValid || !session || session.user.status !== 'ACTIVE') {
        return null;
      }

      return {
        id: session.user.id,
        email: session.user.email,
        roles: session.user.roles,
        activeRole: payload.activeRole ?? session.user.roles[0] ?? 'PATIENT',
        sessionId: session.id,
      };
    } catch {
      return null;
    }
  }

  /**
   * Sends a safe sanitized error message and closes the socket without leaking secrets.
   */
  private sendSafeError(socket: WebSocket, code: number, reason: string): void {
    try {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ERROR', error: reason }));
      }
      socket.close(code, reason.slice(0, 120));
    } catch {
      // socket already closing or closed
    }
  }
}
