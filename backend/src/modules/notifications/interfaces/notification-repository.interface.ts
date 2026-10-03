import {
  NotificationEntity,
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  NotificationDeviceEntity,
} from '../entities/notification.entity.js';
import { NotificationType, NotificationSeverity } from '../enums/index.js';

export interface NotificationFilterOptions {
  userId: string;
  isRead?: boolean | undefined;
  type?: NotificationType | undefined;
  severity?: NotificationSeverity | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface INotificationRepository {
  // Notifications
  createNotification(
    data: Omit<
      NotificationEntity,
      'id' | 'publicNotificationId' | 'createdAt' | 'updatedAt' | 'deliveries'
    >,
  ): Promise<NotificationEntity>;
  findById(id: string): Promise<NotificationEntity | null>;
  findByPublicId(publicId: string): Promise<NotificationEntity | null>;
  findByIdempotencyKey(key: string): Promise<NotificationEntity | null>;
  findUserNotifications(
    options: NotificationFilterOptions,
  ): Promise<PaginatedResult<NotificationEntity>>;
  countUnread(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<NotificationEntity | null>;
  markAllAsRead(userId: string): Promise<number>;
  deleteNotification(id: string, userId: string): Promise<boolean>;

  // Deliveries
  createDelivery(
    data: Omit<NotificationDeliveryEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationDeliveryEntity>;
  updateDelivery(
    id: string,
    data: Partial<
      Omit<NotificationDeliveryEntity, 'id' | 'notificationId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<NotificationDeliveryEntity>;
  findDeliveryById(id: string): Promise<NotificationDeliveryEntity | null>;
  findDeliveriesByNotificationId(notificationId: string): Promise<NotificationDeliveryEntity[]>;
  findPendingOrFailedDeliveries(limit?: number): Promise<NotificationDeliveryEntity[]>;

  // Preferences
  getPreferencesByUserId(userId: string): Promise<NotificationPreferenceEntity | null>;
  upsertPreferences(
    userId: string,
    data: Partial<
      Omit<
        NotificationPreferenceEntity,
        'id' | 'userId' | 'createdAt' | 'updatedAt' | 'securityNotifications'
      >
    >,
  ): Promise<NotificationPreferenceEntity>;

  // Devices
  registerDevice(
    data: Omit<NotificationDeviceEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationDeviceEntity>;
  findDevicesByUserId(userId: string, activeOnly?: boolean): Promise<NotificationDeviceEntity[]>;
  findDeviceById(id: string): Promise<NotificationDeviceEntity | null>;
  updateDevice(
    id: string,
    data: Partial<Pick<NotificationDeviceEntity, 'active' | 'lastSeenAt'>>,
  ): Promise<NotificationDeviceEntity>;
  deleteDevice(id: string, userId: string): Promise<boolean>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
