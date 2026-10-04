import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  ConsentAuditEvent,
  IConsentAuditService,
} from '../interfaces/consent-audit-service.interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ConsentAuditService implements IConsentAuditService {
  private readonly logger = new Logger(ConsentAuditService.name);

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  public logEvent(event: ConsentAuditEvent): void {
    // Structured audit logging compliant with HIPAA / GDPR and MANVIA SECURITY.md
    const sanitizedMetadata = event.metadata ? this.sanitizeMetadata(event.metadata) : undefined;

    const role = event.role ?? event.actorRole ?? 'UNKNOWN';
    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${role} ` +
        `resource=${event.resource} action=${event.action}` +
        (sanitizedMetadata ? ` metadata=${JSON.stringify(sanitizedMetadata)}` : ''),
    );

    if (this.prisma) {
      this.prisma.auditLog
        .create({
          data: {
            actorUserId: event.actorId && UUID_REGEX.test(event.actorId) ? event.actorId : null,
            action: event.action || event.event,
            resourceType: 'CONSENT',
            resourceId: event.resource,
            status: 'SUCCESS',
            details: {
              event: event.event,
              role,
              metadata: sanitizedMetadata ?? {},
            } as Prisma.InputJsonValue,
          },
        })
        .catch((err: unknown) => {
          this.logger.warn(`Failed to persist consent audit log: ${err}`);
        });
    }
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set(['password', 'token', 'authorization', 'secret', 'cookie']);

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
