import { Injectable, Logger } from '@nestjs/common';
import type {
  INotificationAuditService,
  NotificationAuditEvent,
} from '../interfaces/notification-audit-service.interface.js';

@Injectable()
export class NotificationAuditService implements INotificationAuditService {
  private readonly logger = new Logger(NotificationAuditService.name);
  private readonly logs: NotificationAuditEvent[] = [];

  public logEvent(event: NotificationAuditEvent): void {
    // Sanitize metadata: Never log push tokens or sensitive credentials
    const sanitizedMetadata = { ...event.metadata };
    if (sanitizedMetadata.pushToken) {
      sanitizedMetadata.pushToken = '***REDACTED***';
    }
    if (sanitizedMetadata.password) {
      delete sanitizedMetadata.password;
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
  }

  public getAuditLogs(): NotificationAuditEvent[] {
    return [...this.logs];
  }

  public clear(): void {
    this.logs.length = 0;
  }
}
