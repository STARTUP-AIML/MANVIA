import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from '../interfaces/notification-repository.interface.js';
import {
  NOTIFICATION_AUDIT_SERVICE,
  type INotificationAuditService,
} from '../interfaces/notification-audit-service.interface.js';
import { TemplateEngineService } from './template-engine.service.js';
import { NotificationPreferencesService } from './notification-preferences.service.js';
import { NotificationDeliveryService } from './notification-delivery.service.js';
import { NotificationType, NotificationChannel, NotificationSeverity } from '../enums/index.js';
import type {
  NotificationEntity,
  NotificationPreferenceEntity,
} from '../entities/notification.entity.js';
import type { IDomainEvent } from '../../../events/event-bus.interface.js';

export interface NotificationTriggerPayload {
  userId: string;
  type: NotificationType;
  severity?: NotificationSeverity | undefined;
  params?: Record<string, unknown> | undefined;
  metadata?: Record<string, unknown> | undefined;
  idempotencyKey?: string | undefined;
  userEmail?: string | undefined;
  userPhone?: string | undefined;
  userLocale?: string | undefined;
  userTimezone?: string | undefined;
  channelsOverride?: NotificationChannel[] | undefined;
}

@Injectable()
export class NotificationOrchestratorService {
  private readonly logger = new Logger(NotificationOrchestratorService.name);

  public constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(NOTIFICATION_AUDIT_SERVICE)
    private readonly auditService: INotificationAuditService,
    private readonly templateEngine: TemplateEngineService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  /**
   * Main entry point to trigger notifications directly or via domain events.
   */
  public async trigger(payload: NotificationTriggerPayload): Promise<NotificationEntity> {
    const {
      userId,
      type,
      severity = NotificationSeverity.INFO,
      params = {},
      metadata = {},
      idempotencyKey,
      userLocale = 'en',
      userTimezone = 'UTC',
      userEmail,
      userPhone,
      channelsOverride,
    } = payload;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        this.logger.log(
          `[IDEMPOTENT_SKIP] Notification already processed for key=${idempotencyKey}`,
        );
        return existing;
      }
    }

    // 2. Load User Preferences
    const preferences = await this.preferencesService.getPreferences(userId);

    // 3. Determine Enabled Channels according to preferences & notification type
    const candidateChannels = channelsOverride ?? this.determineChannelsForType(type, preferences);

    // 4. Render Primary In-App Content (used as primary title and body for notification entity)
    const inAppRender = this.templateEngine.render(
      type,
      NotificationChannel.IN_APP,
      userLocale,
      params,
      userTimezone,
    );

    // 5. Create Notification Database Entity
    const notification = await this.repository.createNotification({
      userId,
      type,
      title: inAppRender.title,
      body: inAppRender.body,
      severity: this.resolveSeverity(type, severity),
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : null,
      idempotencyKey: idempotencyKey ?? null,
    });

    // 6. Fetch Active Devices for push if PUSH is an active channel
    let pushTokens: string[] = [];
    if (candidateChannels.includes(NotificationChannel.PUSH)) {
      const devices = await this.repository.findDevicesByUserId(userId, true);
      pushTokens = devices.map((d) => d.pushToken);
    }

    // 7. Dispatch Delivery across each target channel
    for (const channel of candidateChannels) {
      await this.deliveryService.dispatchChannel({
        notification,
        channel,
        recipientEmail: userEmail,
        recipientPhone: userPhone,
        pushTokens,
        locale: userLocale,
      });
    }

    // 8. Audit Event
    this.auditService.logEvent({
      event: 'NOTIFICATION_TRIGGERED',
      actorId: userId,
      role: 'SYSTEM',
      resource: `notification:${notification.id}`,
      action: 'TRIGGER',
      metadata: {
        type,
        channels: candidateChannels,
        idempotencyKey,
      },
    });

    const refreshed = await this.repository.findById(notification.id);
    return refreshed ?? notification;
  }

  /**
   * Translates incoming domain events from MANVIA into notification trigger payloads.
   */
  public async handleDomainEvent(event: IDomainEvent<unknown>): Promise<NotificationEntity | null> {
    const payload = (
      typeof event.payload === 'object' && event.payload !== null ? event.payload : {}
    ) as Record<string, unknown>;
    const userId = (payload['userId'] ||
      payload['recipientId'] ||
      payload['patientId'] ||
      payload['doctorId']) as string | undefined;
    if (!userId) {
      this.logger.warn(
        `Cannot orchestrate notification: No recipient userId in event ${event.eventType}`,
      );
      return null;
    }

    const notifType = this.mapEventToNotificationType(event.eventType);
    if (!notifType) {
      this.logger.debug(`No notification mapped for event type: ${event.eventType}`);
      return null;
    }

    // Deterministic idempotency key: eventId + notificationType + userId
    const idempotencyKey = `evt_${event.eventId}_${notifType}_${userId}`;

    return this.trigger({
      userId,
      type: notifType,
      params: {
        ...payload,
        userName: (payload.userName || payload.patientName || 'Valued User') as string,
        doctorName: (payload.doctorName || 'Doctor') as string,
        date: (payload.startTime ||
          payload.appointmentDate ||
          payload.date ||
          new Date().toISOString()) as string,
        amount: payload.amount,
        currency: payload.currency,
        reason: payload.reason,
        location: (payload.location || payload.ipAddress || 'Authorized device') as string,
      },
      metadata: {
        sourceEventId: event.eventId,
        sourceEventType: event.eventType,
        aggregateId: event.aggregateId,
      },
      idempotencyKey,
      userEmail: (payload.userEmail || payload.email) as string | undefined,
      userPhone: (payload.userPhone || payload.phone) as string | undefined,
      userLocale: (payload.locale || 'en') as string,
      userTimezone: (payload.timezone || 'UTC') as string,
    });
  }

  private mapEventToNotificationType(eventType: string): NotificationType | null {
    switch (eventType) {
      // Appointments
      case 'APPOINTMENT_REQUESTED':
        return NotificationType.APPOINTMENT_REQUESTED;
      case 'APPOINTMENT_CONFIRMED':
        return NotificationType.APPOINTMENT_CONFIRMED;
      case 'APPOINTMENT_DECLINED':
        return NotificationType.APPOINTMENT_DECLINED;
      case 'APPOINTMENT_CANCELLED':
        return NotificationType.APPOINTMENT_CANCELLED;
      case 'APPOINTMENT_REMINDER':
        return NotificationType.APPOINTMENT_REMINDER;

      // Waitlist
      case 'WAITLIST_OFFERED':
      case 'WAITLIST_OFFER_CREATED':
        return NotificationType.WAITLIST_OFFER;
      case 'WAITLIST_EXPIRED':
      case 'WAITLIST_OFFER_EXPIRED':
        return NotificationType.WAITLIST_EXPIRED;
      case 'WAITLIST_FULFILLED':
        return NotificationType.WAITLIST_FULFILLED;

      // Refunds
      case 'REFUND_REQUESTED':
        return NotificationType.REFUND_REQUESTED;
      case 'REFUND_SUCCEEDED':
      case 'REFUND_PROCESSED':
      case 'REFUND_COMPLETED':
        return NotificationType.REFUND_COMPLETED;
      case 'REFUND_FAILED':
        return NotificationType.REFUND_FAILED;

      // Doctor Verification
      case 'DOCTOR_VERIFICATION_SUBMITTED':
        return NotificationType.DOCTOR_VERIFICATION_SUBMITTED;
      case 'DOCTOR_VERIFICATION_APPROVED':
        return NotificationType.DOCTOR_VERIFICATION_APPROVED;
      case 'DOCTOR_VERIFICATION_REJECTED':
        return NotificationType.DOCTOR_VERIFICATION_REJECTED;

      // Security
      case 'SECURITY_LOGIN':
      case 'AUTH_LOGIN_SUCCESS':
        return NotificationType.SECURITY_LOGIN;
      case 'SECURITY_PASSWORD_CHANGED':
      case 'AUTH_PASSWORD_CHANGED':
        return NotificationType.SECURITY_PASSWORD_CHANGED;
      case 'SECURITY_SESSION_REVOKED':
        return NotificationType.SECURITY_SESSION_REVOKED;

      // Wellness
      case 'WELLNESS_REMINDER':
        return NotificationType.WELLNESS_REMINDER;

      // System
      case 'SYSTEM_NOTIFICATION':
        return NotificationType.SYSTEM_NOTIFICATION;

      default:
        return null;
    }
  }

  /**
   * Policy evaluation: Determines allowed channels based on preferences and mandatory rules.
   */
  private determineChannelsForType(
    type: NotificationType,
    pref: NotificationPreferenceEntity,
  ): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Security notifications: Mandatory, bypass standard disables
    const isSecurity =
      type === NotificationType.SECURITY_LOGIN ||
      type === NotificationType.SECURITY_PASSWORD_CHANGED ||
      type === NotificationType.SECURITY_SESSION_REVOKED;

    if (isSecurity) {
      channels.push(NotificationChannel.IN_APP);
      channels.push(NotificationChannel.EMAIL);
      if (pref.pushEnabled) {
        channels.push(NotificationChannel.PUSH);
      }
      return channels;
    }

    // Appointment Notifications
    const isAppointment =
      type === NotificationType.APPOINTMENT_REQUESTED ||
      type === NotificationType.APPOINTMENT_CONFIRMED ||
      type === NotificationType.APPOINTMENT_DECLINED ||
      type === NotificationType.APPOINTMENT_CANCELLED ||
      type === NotificationType.APPOINTMENT_REMINDER;

    if (isAppointment && !pref.appointmentNotifications) {
      return [];
    }

    // Waitlist & Refunds are essential service notifications
    // Wellness
    if (type === NotificationType.WELLNESS_REMINDER && !pref.wellnessNotifications) {
      return [];
    }

    // Check channel switches
    if (pref.inAppEnabled) {
      channels.push(NotificationChannel.IN_APP);
    }
    if (pref.emailEnabled) {
      channels.push(NotificationChannel.EMAIL);
    }
    if (pref.pushEnabled) {
      channels.push(NotificationChannel.PUSH);
    }
    if (pref.smsEnabled) {
      channels.push(NotificationChannel.SMS);
    }

    // Always fallback to IN_APP if all disabled for essential service updates
    if (channels.length === 0) {
      channels.push(NotificationChannel.IN_APP);
    }

    return channels;
  }

  private resolveSeverity(
    type: NotificationType,
    fallback: NotificationSeverity,
  ): NotificationSeverity {
    if (
      type === NotificationType.SECURITY_PASSWORD_CHANGED ||
      type === NotificationType.REFUND_FAILED ||
      type === NotificationType.APPOINTMENT_CANCELLED
    ) {
      return NotificationSeverity.WARNING;
    }
    if (
      type === NotificationType.APPOINTMENT_CONFIRMED ||
      type === NotificationType.REFUND_COMPLETED ||
      type === NotificationType.DOCTOR_VERIFICATION_APPROVED
    ) {
      return NotificationSeverity.SUCCESS;
    }
    return fallback;
  }
}
