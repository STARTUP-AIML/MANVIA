import { Injectable } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import type {
  INotificationRepository,
  NotificationFilterOptions,
  PaginatedResult,
} from '../interfaces/notification-repository.interface.js';
import type {
  NotificationEntity,
  NotificationDeliveryEntity,
  NotificationPreferenceEntity,
  NotificationDeviceEntity,
} from '../entities/notification.entity.js';
import { DeliveryStatus } from '../enums/index.js';

@Injectable()
export class InMemoryNotificationRepository implements INotificationRepository {
  public notifications: NotificationEntity[] = [];
  public deliveries: NotificationDeliveryEntity[] = [];
  public preferences: Map<string, NotificationPreferenceEntity> = new Map();
  public devices: NotificationDeviceEntity[] = [];

  private generatePublicId(): string {
    return `NOT-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  // --- Notifications ---

  public async createNotification(
    data: Omit<
      NotificationEntity,
      'id' | 'publicNotificationId' | 'createdAt' | 'updatedAt' | 'deliveries'
    >,
  ): Promise<NotificationEntity> {
    if (data.idempotencyKey) {
      const existing = this.notifications.find((n) => n.idempotencyKey === data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const now = new Date();
    const notification: NotificationEntity = {
      ...data,
      id: randomUUID(),
      publicNotificationId: this.generatePublicId(),
      createdAt: now,
      updatedAt: now,
      deliveries: [],
    };

    this.notifications.push(notification);
    return notification;
  }

  public async findById(id: string): Promise<NotificationEntity | null> {
    const n = this.notifications.find((item) => item.id === id);
    if (!n) return null;
    const dels = this.deliveries.filter((d) => d.notificationId === id);
    return { ...n, deliveries: dels };
  }

  public async findByPublicId(publicId: string): Promise<NotificationEntity | null> {
    const n = this.notifications.find((item) => item.publicNotificationId === publicId);
    if (!n) return null;
    const dels = this.deliveries.filter((d) => d.notificationId === n.id);
    return { ...n, deliveries: dels };
  }

  public async findByIdempotencyKey(key: string): Promise<NotificationEntity | null> {
    const n = this.notifications.find((item) => item.idempotencyKey === key);
    if (!n) return null;
    const dels = this.deliveries.filter((d) => d.notificationId === n.id);
    return { ...n, deliveries: dels };
  }

  public async findUserNotifications(
    options: NotificationFilterOptions,
  ): Promise<PaginatedResult<NotificationEntity>> {
    let filtered = this.notifications.filter((n) => n.userId === options.userId);

    if (options.isRead !== undefined) {
      filtered = filtered.filter((n) => n.isRead === options.isRead);
    }
    if (options.type) {
      filtered = filtered.filter((n) => n.type === options.type);
    }
    if (options.severity) {
      filtered = filtered.filter((n) => n.severity === options.severity);
    }

    // Sort descending by createdAt
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map((n) => {
      const dels = this.deliveries.filter((d) => d.notificationId === n.id);
      return { ...n, deliveries: dels };
    });

    return { data, total, page, limit, totalPages };
  }

  public async countUnread(userId: string): Promise<number> {
    return this.notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }

  public async markAsRead(id: string, userId: string): Promise<NotificationEntity | null> {
    const n = this.notifications.find((item) => item.id === id && item.userId === userId);
    if (!n) return null;

    n.isRead = true;
    n.readAt = new Date();
    n.updatedAt = new Date();
    return { ...n };
  }

  public async markAllAsRead(userId: string): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const n of this.notifications) {
      if (n.userId === userId && !n.isRead) {
        n.isRead = true;
        n.readAt = now;
        n.updatedAt = now;
        count++;
      }
    }
    return count;
  }

  public async deleteNotification(id: string, userId: string): Promise<boolean> {
    const index = this.notifications.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return false;

    this.notifications.splice(index, 1);
    this.deliveries = this.deliveries.filter((d) => d.notificationId !== id);
    return true;
  }

  // --- Deliveries ---

  public async createDelivery(
    data: Omit<NotificationDeliveryEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationDeliveryEntity> {
    const now = new Date();
    const delivery: NotificationDeliveryEntity = {
      ...data,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.deliveries.push(delivery);
    return delivery;
  }

  public async updateDelivery(
    id: string,
    data: Partial<
      Omit<NotificationDeliveryEntity, 'id' | 'notificationId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<NotificationDeliveryEntity> {
    const d = this.deliveries.find((item) => item.id === id);
    if (!d) {
      throw new Error(`Delivery not found: ${id}`);
    }

    Object.assign(d, data, { updatedAt: new Date() });
    return { ...d };
  }

  public async findDeliveryById(id: string): Promise<NotificationDeliveryEntity | null> {
    const d = this.deliveries.find((item) => item.id === id);
    return d ? { ...d } : null;
  }

  public async findDeliveriesByNotificationId(
    notificationId: string,
  ): Promise<NotificationDeliveryEntity[]> {
    return this.deliveries.filter((d) => d.notificationId === notificationId);
  }

  public async findPendingOrFailedDeliveries(
    limit: number = 50,
  ): Promise<NotificationDeliveryEntity[]> {
    return this.deliveries
      .filter((d) => d.status === DeliveryStatus.PENDING || d.status === DeliveryStatus.FAILED)
      .slice(0, limit);
  }

  // --- Preferences ---

  public async getPreferencesByUserId(
    userId: string,
  ): Promise<NotificationPreferenceEntity | null> {
    const p = this.preferences.get(userId);
    return p ? { ...p } : null;
  }

  public async upsertPreferences(
    userId: string,
    data: Partial<
      Omit<
        NotificationPreferenceEntity,
        'id' | 'userId' | 'createdAt' | 'updatedAt' | 'securityNotifications'
      >
    >,
  ): Promise<NotificationPreferenceEntity> {
    const now = new Date();
    const existing = this.preferences.get(userId);
    if (existing) {
      const updated: NotificationPreferenceEntity = {
        ...existing,
        ...data,
        securityNotifications: true, // Invariant: Cannot disable security
        updatedAt: now,
      };
      this.preferences.set(userId, updated);
      return updated;
    }

    const created: NotificationPreferenceEntity = {
      id: randomUUID(),
      userId,
      emailEnabled: data.emailEnabled ?? true,
      pushEnabled: data.pushEnabled ?? true,
      smsEnabled: data.smsEnabled ?? false,
      inAppEnabled: data.inAppEnabled ?? true,
      appointmentNotifications: data.appointmentNotifications ?? true,
      wellnessNotifications: data.wellnessNotifications ?? true,
      marketingNotifications: data.marketingNotifications ?? false,
      systemNotifications: data.systemNotifications ?? true,
      securityNotifications: true, // Invariant: Always true
      createdAt: now,
      updatedAt: now,
    };
    this.preferences.set(userId, created);
    return created;
  }

  // --- Devices ---

  public async registerDevice(
    data: Omit<NotificationDeviceEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationDeviceEntity> {
    const now = new Date();
    const existing = this.devices.find(
      (d) => d.userId === data.userId && d.pushToken === data.pushToken,
    );
    if (existing) {
      existing.active = true;
      existing.lastSeenAt = now;
      existing.updatedAt = now;
      if (data.deviceId) existing.deviceId = data.deviceId;
      return { ...existing };
    }

    const device: NotificationDeviceEntity = {
      ...data,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.devices.push(device);
    return device;
  }

  public async findDevicesByUserId(
    userId: string,
    activeOnly: boolean = true,
  ): Promise<NotificationDeviceEntity[]> {
    return this.devices.filter((d) => d.userId === userId && (!activeOnly || d.active));
  }

  public async findDeviceById(id: string): Promise<NotificationDeviceEntity | null> {
    const d = this.devices.find((item) => item.id === id);
    return d ? { ...d } : null;
  }

  public async updateDevice(
    id: string,
    data: Partial<Pick<NotificationDeviceEntity, 'active' | 'lastSeenAt'>>,
  ): Promise<NotificationDeviceEntity> {
    const d = this.devices.find((item) => item.id === id);
    if (!d) {
      throw new Error(`Device not found: ${id}`);
    }
    Object.assign(d, data, { updatedAt: new Date() });
    return { ...d };
  }

  public async deleteDevice(id: string, userId: string): Promise<boolean> {
    const index = this.devices.findIndex((d) => d.id === id && d.userId === userId);
    if (index === -1) return false;
    this.devices.splice(index, 1);
    return true;
  }

  public clear(): void {
    this.notifications = [];
    this.deliveries = [];
    this.preferences.clear();
    this.devices = [];
  }
}
