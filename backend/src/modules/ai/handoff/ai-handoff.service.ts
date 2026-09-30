import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { generatePublicHandoffId } from '../utils/public-ai-id.util.js';
import { RequestAIHandoffDto } from './dto/request-handoff.dto.js';
import { AIHandoffResponseDto } from './dto/handoff-response.dto.js';
import { AIHandoffStatus, AIHandoffUrgency } from './handoff.enums.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import { AIAuditService } from '../services/ai-audit.service.js';

@Injectable()
export class AIHandoffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AIAuditService,
  ) {}

  public async requestHandoff(
    userId: string,
    dto: RequestAIHandoffDto,
  ): Promise<AIHandoffResponseDto> {
    let resolvedConversationId: string | null = null;
    if (dto.conversationId) {
      const isConvUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        dto.conversationId,
      );
      const conv = await this.prisma.aIConversation.findFirst({
        where: isConvUuid
          ? { OR: [{ id: dto.conversationId }, { publicConversationId: dto.conversationId }] }
          : { publicConversationId: dto.conversationId },
      });
      if (!conv) {
        throw new NotFoundError('Conversation not found');
      }
      if (conv.userId !== userId) {
        throw new ForbiddenError('Access denied: You do not own this conversation');
      }
      resolvedConversationId = conv.id;
    }

    const publicHandoffId = generatePublicHandoffId();
    const handoff = await this.prisma.aIHumanHandoff.create({
      data: {
        publicHandoffId,
        userId,
        conversationId: resolvedConversationId,
        reason: dto.reason,
        safetyLevel: 'ROUTINE',
        requestedUrgency: dto.requestedUrgency ?? AIHandoffUrgency.ROUTINE,
        status: AIHandoffStatus.REQUESTED,
        userSummary: dto.userSummary ?? null,
        consentGranted: dto.consentGranted ?? true,
      },
    });

    this.auditService.logEvent({
      event: 'AI_HANDOFF_REQUESTED',
      actorId: userId,
      role: 'USER',
      action: 'AI_HANDOFF_REQUESTED',
      resource: `AI_HANDOFF:${publicHandoffId}`,
      metadata: {
        reason: dto.reason,
        urgency: handoff.requestedUrgency,
        consentGranted: handoff.consentGranted,
      },
    });

    return this.mapToDto(handoff);
  }

  public async listUserHandoffs(userId: string): Promise<AIHandoffResponseDto[]> {
    const list = await this.prisma.aIHumanHandoff.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return list.map((h) => this.mapToDto(h));
  }

  public async getUserHandoff(
    userId: string,
    handoffIdentifier: string,
  ): Promise<AIHandoffResponseDto> {
    const handoff = await this.findHandoffOrThrow(handoffIdentifier);

    if (handoff.userId !== userId) {
      this.auditService.logEvent({
        event: 'AI_ACCESS_DENIED',
        actorId: userId,
        role: 'USER',
        action: 'AI_ACCESS_DENIED',
        resource: `AI_HANDOFF:${handoff.publicHandoffId}`,
        metadata: { reason: 'Access denied: You do not own this handoff request' },
      });
      throw new ForbiddenError('Access denied: You do not own this handoff request');
    }

    return this.mapToDto(handoff);
  }

  public async cancelHandoff(
    userId: string,
    handoffIdentifier: string,
  ): Promise<AIHandoffResponseDto> {
    const handoff = await this.findHandoffOrThrow(handoffIdentifier);

    if (handoff.userId !== userId) {
      throw new ForbiddenError('Access denied: You do not own this handoff request');
    }

    if (
      handoff.status === AIHandoffStatus.COMPLETED ||
      handoff.status === AIHandoffStatus.CANCELLED
    ) {
      throw new ValidationError(`Cannot cancel handoff in status '${handoff.status}'`);
    }

    const updated = await this.prisma.aIHumanHandoff.update({
      where: { id: handoff.id },
      data: {
        status: AIHandoffStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });

    this.auditService.logEvent({
      event: 'AI_HANDOFF_CANCELLED',
      actorId: userId,
      role: 'USER',
      action: 'AI_HANDOFF_CANCELLED',
      resource: `AI_HANDOFF:${handoff.publicHandoffId}`,
    });

    return this.mapToDto(updated);
  }

  public async listPendingHandoffsForDoctor(doctorUserId: string): Promise<AIHandoffResponseDto[]> {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
    });

    if (!doctorProfile || doctorProfile.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenError('Access denied: Verified doctor profile required');
    }

    const pending = await this.prisma.aIHumanHandoff.findMany({
      where: {
        status: { in: [AIHandoffStatus.REQUESTED, AIHandoffStatus.QUEUED] },
      },
      orderBy: { createdAt: 'asc' },
    });

    return pending.map((h) => this.mapToDto(h));
  }

  public async acceptHandoff(
    doctorUserId: string,
    handoffIdentifier: string,
  ): Promise<AIHandoffResponseDto> {
    const doctorProfile = await this.prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
    });

    if (!doctorProfile || doctorProfile.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenError('Access denied: Verified doctor profile required');
    }

    const handoff = await this.findHandoffOrThrow(handoffIdentifier);

    if (handoff.status !== AIHandoffStatus.REQUESTED && handoff.status !== AIHandoffStatus.QUEUED) {
      throw new ValidationError(`Cannot accept handoff in status '${handoff.status}'`);
    }

    const updated = await this.prisma.aIHumanHandoff.update({
      where: { id: handoff.id },
      data: {
        status: AIHandoffStatus.ACCEPTED,
        assignedDoctorId: doctorProfile.id,
        acceptedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.auditService.logEvent({
      event: 'AI_HANDOFF_ACCEPTED',
      actorId: doctorUserId,
      role: 'DOCTOR',
      action: 'AI_HANDOFF_ACCEPTED',
      resource: `AI_HANDOFF:${handoff.publicHandoffId}`,
      metadata: { doctorId: doctorProfile.id },
    });

    return this.mapToDto(updated);
  }

  private async findHandoffOrThrow(handoffIdentifier: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      handoffIdentifier,
    );
    const handoff = await this.prisma.aIHumanHandoff.findFirst({
      where: isUuid
        ? { OR: [{ id: handoffIdentifier }, { publicHandoffId: handoffIdentifier }] }
        : { publicHandoffId: handoffIdentifier },
    });

    if (!handoff) {
      throw new NotFoundError('Handoff request not found');
    }

    return handoff;
  }

  private mapToDto(record: {
    id: string;
    publicHandoffId: string;
    userId: string;
    conversationId: string | null;
    assignedDoctorId: string | null;
    reason: string;
    safetyLevel: string;
    requestedUrgency: AIHandoffUrgency;
    status: AIHandoffStatus;
    userSummary: string | null;
    consentGranted: boolean;
    acceptedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): AIHandoffResponseDto {
    return {
      id: record.id,
      publicHandoffId: record.publicHandoffId,
      userId: record.userId,
      conversationId: record.conversationId,
      assignedDoctorId: record.assignedDoctorId,
      reason: record.reason,
      safetyLevel: record.safetyLevel,
      requestedUrgency: record.requestedUrgency,
      status: record.status,
      userSummary: record.userSummary,
      consentGranted: record.consentGranted,
      acceptedAt: record.acceptedAt ? record.acceptedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
