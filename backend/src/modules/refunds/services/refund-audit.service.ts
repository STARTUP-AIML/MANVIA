import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  IRefundAuditService,
  RefundAuditEvent,
} from '../interfaces/refund-audit-service.interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RefundAuditService implements IRefundAuditService {
  private readonly logger = new Logger(RefundAuditService.name);
  private readonly logs: RefundAuditEvent[] = [];

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  public logEvent(event: RefundAuditEvent): void {
    const sanitizedMetadata = this.sanitizeMetadata(event.metadata ?? {});
    this.logs.push({ ...event, metadata: sanitizedMetadata });
    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} resource=${event.resource} action=${event.action} metadata=${JSON.stringify(sanitizedMetadata)}`,
    );

    if (this.prisma) {
      this.prisma.auditLog
        .create({
          data: {
            actorUserId: event.actorId && UUID_REGEX.test(event.actorId) ? event.actorId : null,
            action: event.action || event.event,
            resourceType: 'REFUND',
            resourceId: event.resource,
            status: 'SUCCESS',
            details: {
              event: event.event,
              role: event.role,
              metadata: sanitizedMetadata,
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err: unknown) => {
          this.logger.warn(`Failed to persist refund audit log: ${err}`);
        });
    }
  }

  public getAuditLogs(): RefundAuditEvent[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs.length = 0;
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'password',
      'secret',
      'token',
      'signature',
      'credential',
      'cvv',
      'cardnumber',
      'pan',
      'apikey',
      'authorization',
    ]);

    for (const [key, val] of Object.entries(metadata)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        sanitized[key] = this.sanitizeMetadata(val as Record<string, unknown>);
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
}
