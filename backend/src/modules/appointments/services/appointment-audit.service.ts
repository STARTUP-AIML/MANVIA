import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  AppointmentAuditEvent,
  IAppointmentAuditService,
} from '../interfaces/appointment-audit-service.interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class AppointmentAuditService implements IAppointmentAuditService {
  private readonly logger = new Logger(AppointmentAuditService.name);

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  public logEvent(event: AppointmentAuditEvent): void {
    const sanitizedMetadata = event.metadata ? this.sanitizeMetadata(event.metadata) : undefined;
    const metaStr = sanitizedMetadata ? ` metadata=${JSON.stringify(sanitizedMetadata)}` : '';

    this.logger.log(
      `[AUDIT] event=${event.event} actor=${event.actorId} role=${event.role} resource=${event.resource} action=${event.action}${metaStr}`,
    );

    if (this.prisma) {
      this.prisma.auditLog
        .create({
          data: {
            actorUserId: event.actorId && UUID_REGEX.test(event.actorId) ? event.actorId : null,
            action: event.action || event.event,
            resourceType: 'APPOINTMENT',
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
          this.logger.warn(`Failed to persist appointment audit log: ${err}`);
        });
    }
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      'note',
      'notes',
      'password',
      'token',
      'credential',
      'reason',
      'symptoms',
      'allergies',
      'medications',
    ]);

    for (const [key, val] of Object.entries(metadata)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED_CLINICAL_DATA]';
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }
}
