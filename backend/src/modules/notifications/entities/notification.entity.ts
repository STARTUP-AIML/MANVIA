import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  DeliveryStatus,
  DevicePlatform,
} from '../enums/index.js';

export interface NotificationEntity {
  id: string;
  publicNotificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt: Date | null;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  deliveries?: NotificationDeliveryEntity[] | undefined;
}

export interface NotificationDeliveryEntity {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  lastAttemptAt: Date | null;
  deliveredAt: Date | null;
  failedAt: Date | null;
  failureCode: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferenceEntity {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  appointmentNotifications: boolean;
  wellnessNotifications: boolean;
  marketingNotifications: boolean;
  systemNotifications: boolean;
  securityNotifications: boolean; // Always true, non-disableable
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDeviceEntity {
  id: string;
  userId: string;
  platform: DevicePlatform;
  pushToken: string;
  deviceId: string | null;
  active: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplateEntity {
  id: string;
  notificationType: NotificationType;
  channel: NotificationChannel;
  locale: string;
  titleTemplate: string;
  bodyTemplate: string;
  version: string;
  active: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}
