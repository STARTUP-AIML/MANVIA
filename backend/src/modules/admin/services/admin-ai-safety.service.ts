import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { AdminAISafetyQueryDto } from '../dto/admin-ai-safety-query.dto.js';
import type { AdminAIHandoffQueryDto } from '../dto/admin-ai-handoff-query.dto.js';
import type { AdjudicateAIHandoffDto } from '../dto/adjudicate-ai-handoff.dto.js';
import { AdminAuditService } from './admin-audit.service.js';

@Injectable()
export class AdminAISafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  public async listSafetyEvents(query: AdminAISafetyQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AISafetyEventWhereInput = {};

    if (query.classification) {
      where.classification = query.classification;
    }
    if (query.actionTaken) {
      where.actionTaken = query.actionTaken;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.aISafetyEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.aISafetyEvent.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async listHumanHandoffs(query: AdminAIHandoffQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AIHumanHandoffWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.urgency) {
      where.requestedUrgency = query.urgency;
    }
    if (query.doctorId) {
      where.assignedDoctorId = query.doctorId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }

    const [items, total] = await Promise.all([
      this.prisma.aIHumanHandoff.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          assignedDoctor: {
            select: {
              id: true,
              publicDoctorId: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.aIHumanHandoff.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async adjudicateHandoff(
    handoffId: string,
    dto: AdjudicateAIHandoffDto,
    adminUserId: string,
  ) {
    const handoff = await this.prisma.aIHumanHandoff.findUnique({
      where: { id: handoffId },
    });

    if (!handoff) {
      throw new NotFoundError(`AI Human Handoff with id ${handoffId} not found`);
    }

    const previousStatus = handoff.status;
    const now = new Date();

    const updated = await this.prisma.aIHumanHandoff.update({
      where: { id: handoffId },
      data: {
        status: dto.status,
        ...(dto.assignedDoctorId ? { assignedDoctorId: dto.assignedDoctorId } : {}),
        ...(dto.status === 'ACCEPTED' ? { acceptedAt: now } : {}),
        ...(dto.status === 'COMPLETED' ? { completedAt: now } : {}),
        metadata: {
          ...((handoff.metadata as Record<string, unknown>) || {}),
          adminNotes: dto.adminNotes,
          adjudicatedBy: adminUserId,
          adjudicatedAt: now.toISOString(),
        },
      },
    });

    await this.auditService.recordAdminAction({
      actorUserId: adminUserId,
      action: 'ADMIN.AI_HANDOFF_ADJUDICATED',
      resourceType: 'AI_HUMAN_HANDOFF',
      resourceId: handoffId,
      status: 'SUCCESS',
      details: {
        previousStatus,
        newStatus: dto.status,
        assignedDoctorId: dto.assignedDoctorId,
        adminNotes: dto.adminNotes,
      },
    });

    return updated;
  }
}
