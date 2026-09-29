// ==============================================================================
// MANVIA — Audit Log Repository
// ==============================================================================
// Phase 4: Data Access for Authentication & Security Event Audit Trail
// ==============================================================================

import { Injectable } from '@nestjs/common';
import type { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  ITransactionalRepository,
  TransactionClient,
} from '../../../database/database.interface.js';
import type { CreateAuditLogData } from '../auth.interface.js';

@Injectable()
export class AuditLogRepository implements ITransactionalRepository {
  private tx?: TransactionClient;

  constructor(private readonly prisma: PrismaService) {}

  public withTransaction(tx: TransactionClient): this {
    const clone = new AuditLogRepository(this.prisma);
    clone.tx = tx;
    return clone as this;
  }

  private get client(): PrismaService | TransactionClient {
    return this.tx ?? this.prisma;
  }

  public async create(data: CreateAuditLogData): Promise<AuditLog> {
    return this.client.auditLog.create({
      data: {
        actorUserId: data.actorUserId ?? null,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId ?? null,
        status: data.status,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        details: (data.details as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }

  public async findByUserId(userId: string, limit = 50): Promise<AuditLog[]> {
    return this.client.auditLog.findMany({
      where: { actorUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
