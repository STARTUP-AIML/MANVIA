import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  HealthRecordsAuditEvent,
  IHealthRecordsAuditService,
} from '../interfaces/health-records-audit-service.interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class HealthRecordsAuditService implements IHealthRecordsAuditService {
  private readonly logger = new Logger(HealthRecordsAuditService.name);

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  public logEvent(event: HealthRecordsAuditEvent): void {
    const sanitizedMetadata = event.metadata ? this.sanitizeMetadata(event.metadata) : undefined;

    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} ` +
        `resource=${event.resource} action=${event.action}` +
        (sanitizedMetadata ? ` metadata=${JSON.stringify(sanitizedMetadata)}` : ''),
    );

    if (this.prisma) {
      this.prisma.auditLog
        .create({
          data: {
            actorUserId: event.actorId && UUID_REGEX.test(event.actorId) ? event.actorId : null,
            action: event.action || event.event,
            resourceType: 'HEALTH_RECORD',
            resourceId: event.resource,
            status: 'SUCCESS',
            details: {
              event: event.event,
              role: event.role,
              metadata: sanitizedMetadata ?? {},
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err: unknown) => {
          this.logger.warn(`Failed to persist health records audit log: ${err}`);
        });
    }
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'password',
      'token',
      'authorization',
      'secret',
      'cookie',
      'dek',
      'encrypteddek',
      'buffer',
      'filecontent',
      'signedurl',
    ]);

    for (const [key, value] of Object.entries(metadata)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
