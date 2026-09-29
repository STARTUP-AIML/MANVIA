import { Injectable, Logger } from '@nestjs/common';
import type { INotificationService, NotificationPayload } from './notification.interface.js';

@Injectable()
export class NotificationService implements INotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly dispatched: NotificationPayload[] = [];

  public async send(payload: NotificationPayload): Promise<boolean> {
    const notification: NotificationPayload = {
      ...payload,
      sentAt: payload.sentAt ?? new Date(),
      channel: payload.channel ?? 'IN_APP',
    };

    this.dispatched.push(notification);

    // HIPAA / Privacy: Sanitize metadata, never leak clinical/medical notes
    const sanitizedMetadata = { ...payload.metadata };
    delete (sanitizedMetadata as Record<string, unknown>).notes;
    delete (sanitizedMetadata as Record<string, unknown>).symptoms;
    delete (sanitizedMetadata as Record<string, unknown>).allergies;

    this.logger.log(
      `[NOTIFICATION] type=${payload.type} recipient=${payload.recipientId} channel=${notification.channel} title="${payload.title}"`,
    );

    return true;
  }

  public getDispatchedNotifications(): NotificationPayload[] {
    return [...this.dispatched];
  }

  public clear(): void {
    this.dispatched.length = 0;
  }
}
