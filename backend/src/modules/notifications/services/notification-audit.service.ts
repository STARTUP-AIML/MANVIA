import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  INotificationAuditService,
  NotificationAuditEvent,
} from '../interfaces/notification-audit-service.interface.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class NotificationAuditService implements INotificationAuditService {
  private readonly logger = new Logger(NotificationAuditService.name);
  private readonly logs: NotificationAuditEvent[] = [];

  constructor(
    @Optional()
    @Inject(PrismaService)
    private readonly prisma?: PrismaService,
  ) {}

  public logEvent(event: NotificationAuditEvent): void {
    // Sanitize metadata: Never log push tokens or sensitive credentials
    const sanitizedMetadata = { ...event.metadata };
    if (sanitizedMetadata.pushToken) {
      sanitizedMetadata.pushToken = '***REDACTED***';
    }
    if (sanitizedMetadata.password) {
      delete sanitizedMetadata.password;
    }
    if (sanitizedMetadata.token) {
      sanitizedMetadata.token = '***REDACTED***';
    }
    if (sanitizedMetadata.secret) {
      sanitizedMetadata.secret = '***REDACTED***';
    }

    const record: NotificationAuditEvent = {
      ...event,
      metadata: sanitizedMetadata,
      timestamp: event.timestamp ?? new Date(),
    };

    this.logs.push(record);
    this.logger.log(
      `[AUDIT] event=${record.event} actor=${record.actorId} role=${record.role} resource=${record.resource} action=${record.action}`,
    );

    if (this.prisma) {
      this.prisma.auditLog
        .create({
          data: {
            actorUserId: event.actorId && UUID_REGEX.test(event.actorId) ? event.actorId : null,
            action: event.action || event.event,
            resourceType: 'NOTIFICATION',
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
          this.logger.warn(`Failed to persist notification audit log: ${err}`);
        });
    }
  }

  public getAuditLogs(): NotificationAuditEvent[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
