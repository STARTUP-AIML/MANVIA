import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AdminAuditQueryDto } from '../dto/admin-audit-query.dto.js';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  public async recordAdminAction(params: {
    actorUserId: string;
    action: string;
    resourceType: string;
    resourceId?: string | null;
    status?: 'SUCCESS' | 'FAILURE';
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, unknown>;
  }): Promise<void> {
    let linkedActorUserId: string | null = null;
    if (params.actorUserId) {
      try {
        const userExists = await this.prisma.user.findUnique({
          where: { id: params.actorUserId },
          select: { id: true },
        });
        if (userExists) {
          linkedActorUserId = userExists.id;
        }
      } catch {
        linkedActorUserId = null;
      }
    }

    const detailsPayload = {
      ...(params.details || {}),
      ...(!linkedActorUserId && params.actorUserId
        ? { unlinkedActorUserId: params.actorUserId }
        : {}),
    };

    await this.prisma.auditLog.create({
      data: {
        actorUserId: linkedActorUserId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        status: params.status ?? 'SUCCESS',
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        details: (detailsPayload as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  public async queryAuditLogs(query: AdminAuditQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }
    if (query.action) {
      where.action = { contains: query.action, mode: 'insensitive' };
    }
    if (query.resourceType) {
      where.resourceType = { contains: query.resourceType, mode: 'insensitive' };
    }
    if (query.resourceId) {
      where.resourceId = query.resourceId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              roles: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
