import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { REALTIME_AI_PROVIDER } from '../providers/provider.tokens.js';
import {
  type RealtimeAIProvider,
  type RealtimeSessionConnectionInfo,
} from './realtime-provider.interface.js';
import { RealtimeStateMachine } from './realtime-state-machine.js';
import { AIRealtimeState } from './realtime.enums.js';
import { generatePublicRealtimeSessionId } from '../utils/public-ai-id.util.js';
import { CreateAIRealtimeSessionDto } from './dto/create-realtime-session.dto.js';
import { AIRealtimeSessionResponseDto } from './dto/realtime-session-response.dto.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import { AIAuditService } from '../services/ai-audit.service.js';

@Injectable()
export class AIRealtimeService {
  constructor(
    @Inject(REALTIME_AI_PROVIDER)
    private readonly provider: RealtimeAIProvider,
    private readonly prisma: PrismaService,
    private readonly auditService: AIAuditService,
  ) {}

  public async createSession(
    userId: string,
    dto: CreateAIRealtimeSessionDto,
  ): Promise<AIRealtimeSessionResponseDto> {
    const publicSessionId = generatePublicRealtimeSessionId();
    const model = dto.model ?? 'realtime-companion-v1';
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const connectionInfo = await this.provider.createSession({
      userId,
      sessionId: publicSessionId,
      model,
    });

    const session = await this.prisma.aIRealtimeSession.create({
      data: {
        publicSessionId,
        userId,
        provider: 'MOCK_REALTIME_PROVIDER',
        model,
        state: AIRealtimeState.IDLE,
        connectionInfo: connectionInfo as unknown as object,
        expiresAt,
      },
    });

    this.auditService.logEvent({
      event: 'REALTIME_SESSION_CREATED',
      actorId: userId,
      role: 'USER',
      action: 'REALTIME_SESSION_CREATED',
      resource: `AI_REALTIME_SESSION:${publicSessionId}`,
      metadata: { model, provider: session.provider },
    });

    return this.mapToDto(session, connectionInfo);
  }

  public async getSession(
    userId: string,
    sessionIdentifier: string,
  ): Promise<AIRealtimeSessionResponseDto> {
    const session = await this.findSessionOrThrow(sessionIdentifier);

    if (session.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        action: 'AI_ACCESS_DENIED',
        resource: `AI_REALTIME_SESSION:${session.publicSessionId}`,
        metadata: { reason: 'Access denied: You do not own this realtime session' },
      });
      throw new ForbiddenError('Access denied: You do not own this realtime session');
    }

    if (session.expiresAt < new Date()) {
      throw new ValidationError('Realtime session has expired');
    }

    return this.mapToDto(session);
  }

  public async transitionState(
    userId: string,
    sessionIdentifier: string,
    nextState: AIRealtimeState,
  ): Promise<AIRealtimeSessionResponseDto> {
    const session = await this.findSessionOrThrow(sessionIdentifier);

    if (session.userId !== userId) {
      throw new ForbiddenError('Access denied: You do not own this realtime session');
    }

    if (session.expiresAt < new Date()) {
      throw new ValidationError('Realtime session has expired');
    }

    RealtimeStateMachine.validateTransition(session.state, nextState);

    let interruptionCount = session.interruptionCount;
    if (nextState === AIRealtimeState.INTERRUPTED) {
      interruptionCount += 1;
      await this.provider.interruptResponse(session.publicSessionId);
    }

    const updated = await this.prisma.aIRealtimeSession.update({
      where: { id: session.id },
      data: {
        state: nextState,
        interruptionCount,
        updatedAt: new Date(),
      },
    });

    this.auditService.logEvent({
      event: 'REALTIME_STATE_TRANSITION',
      actorId: userId,
      role: 'USER',
      action: 'REALTIME_STATE_TRANSITION',
      resource: `AI_REALTIME_SESSION:${session.publicSessionId}`,
      metadata: { from: session.state, to: nextState, interruptionCount },
    });

    return this.mapToDto(updated);
  }

  public async interruptSession(
    userId: string,
    sessionIdentifier: string,
  ): Promise<{ interrupted: boolean; latencyMs: number }> {
    const session = await this.findSessionOrThrow(sessionIdentifier);

    if (session.userId !== userId) {
      throw new ForbiddenError('Access denied: You do not own this realtime session');
    }

    RealtimeStateMachine.validateTransition(session.state, AIRealtimeState.INTERRUPTED);

    const cancelResult = await this.provider.interruptResponse(session.publicSessionId);

    await this.prisma.aIRealtimeSession.update({
      where: { id: session.id },
      data: {
        state: AIRealtimeState.INTERRUPTED,
        interruptionCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    this.auditService.logEvent({
      event: 'REALTIME_BARGE_IN_INTERRUPTED',
      actorId: userId,
      role: 'USER',
      action: 'REALTIME_BARGE_IN_INTERRUPTED',
      resource: `AI_REALTIME_SESSION:${session.publicSessionId}`,
      metadata: { latencyMs: cancelResult.latencyMs },
    });

    return { interrupted: true, latencyMs: cancelResult.latencyMs };
  }

  public async endSession(
    userId: string,
    sessionIdentifier: string,
  ): Promise<{ success: boolean; id: string }> {
    const session = await this.findSessionOrThrow(sessionIdentifier);

    if (session.userId !== userId) {
      throw new ForbiddenError('Access denied: You do not own this realtime session');
    }

    if (session.state !== AIRealtimeState.ENDED) {
      await this.provider.endSession(session.publicSessionId);
      await this.prisma.aIRealtimeSession.update({
        where: { id: session.id },
        data: {
          state: AIRealtimeState.ENDED,
          updatedAt: new Date(),
        },
      });
    }

    this.auditService.logEvent({
      event: 'REALTIME_SESSION_ENDED',
      actorId: userId,
      role: 'USER',
      action: 'REALTIME_SESSION_ENDED',
      resource: `AI_REALTIME_SESSION:${session.publicSessionId}`,
    });

    return { success: true, id: session.publicSessionId };
  }

  private async findSessionOrThrow(sessionIdentifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sessionIdentifier,
    );
    const session = await this.prisma.aIRealtimeSession.findFirst({
      where: isUuid
        ? { OR: [{ id: sessionIdentifier }, { publicSessionId: sessionIdentifier }] }
        : { publicSessionId: sessionIdentifier },
    });

    if (!session) {
      throw new NotFoundError('Realtime session not found');
    }

    return session;
  }

  private mapToDto(
    session: {
      id: string;
      publicSessionId: string;
      provider: string;
      model: string;
      state: AIRealtimeState;
      connectionInfo: unknown;
      interruptionCount: number;
      expiresAt: Date;
      createdAt: Date;
    },
    connectionInfoOverride?: RealtimeSessionConnectionInfo,
  ): AIRealtimeSessionResponseDto {
    const rawConn = (connectionInfoOverride ?? session.connectionInfo) as
      RealtimeSessionConnectionInfo | null | undefined;
    return {
      id: session.id,
      publicSessionId: session.publicSessionId,
      provider: session.provider,
      model: session.model,
      state: session.state,
      supportedModalities: ['AUDIO', 'TEXT'],
      connectionInfo: rawConn
        ? {
            transport: rawConn.transport ?? 'websocket',
            endpoint: rawConn.endpoint ?? '',
            clientSessionToken: rawConn.clientSessionToken ?? '',
            expiresInSeconds: rawConn.expiresInSeconds ?? 3600,
          }
        : null,
      interruptionCount: session.interruptionCount,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    };
  }
}
