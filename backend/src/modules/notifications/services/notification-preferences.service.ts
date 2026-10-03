import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from '../interfaces/notification-repository.interface.js';
import {
  NOTIFICATION_AUDIT_SERVICE,
  type INotificationAuditService,
} from '../interfaces/notification-audit-service.interface.js';
import type { NotificationPreferenceEntity } from '../entities/notification.entity.js';
import type { UpdateNotificationPreferencesDto } from '../dto/update-preferences.dto.js';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  public constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(NOTIFICATION_AUDIT_SERVICE)
    private readonly auditService: INotificationAuditService,
  ) {}

  public async getPreferences(userId: string): Promise<NotificationPreferenceEntity> {
    const existing = await this.repository.getPreferencesByUserId(userId);
    if (existing) {
      return existing;
    }

    // Default preferences: Everything enabled except SMS and Marketing
    return this.repository.upsertPreferences(userId, {
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      appointmentNotifications: true,
      wellnessNotifications: true,
      marketingNotifications: false,
      systemNotifications: true,
    });
  }

  public async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
    actorId: string = userId,
    actorRole: string = 'PATIENT',
  ): Promise<NotificationPreferenceEntity> {
    const updated = await this.repository.upsertPreferences(userId, dto);

    this.auditService.logEvent({
      event: 'NOTIFICATION_PREFERENCES_UPDATED',
      actorId,
      role: actorRole,
      resource: `notification_preference:${userId}`,
      action: 'UPDATE',
      metadata: { ...dto },
    });

    this.logger.log(`[PREFERENCES_UPDATED] userId=${userId}`);
    return updated;
  }
}
