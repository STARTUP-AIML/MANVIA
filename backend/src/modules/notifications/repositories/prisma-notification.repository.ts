import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { randomBytes } from 'node:crypto';
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
import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  DeliveryStatus,
  DevicePlatform,
} from '../enums/index.js';

interface RawNotification {
  id: string;
  publicNotificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt: Date | string | null;
  expiresAt: Date | string | null;
  metadata: string | null;
  idempotencyKey: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deliveries?: RawDelivery[] | undefined;
}

interface RawDelivery {
  id: string;
  notificationId: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  provider: string | null;
  providerMessageId: string | null;
  attemptCount: number;
  lastAttemptAt: Date | string | null;
  deliveredAt: Date | string | null;
  failedAt: Date | string | null;
  failureCode: string | null;
  failureReason: string | null;
  metadata: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RawPreference {
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface RawDevice {
  id: string;
  userId: string;
  platform: DevicePlatform;
  pushToken: string;
  deviceId: string | null;
  active: boolean;
  lastSeenAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<T>;
  findUnique(args: {
    where: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T | null>;
  findFirst?(args: {
    where: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
    include?: Record<string, unknown>;
  }): Promise<T[]>;
  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T>;
  updateMany?(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  upsert?(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T>;
  delete(args: { where: Record<string, unknown> }): Promise<T>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaNotificationClientLike {
  notification: PrismaModelDelegate<RawNotification>;
  notificationDelivery: PrismaModelDelegate<RawDelivery>;
  notificationPreference: PrismaModelDelegate<RawPreference>;
  notificationDevice: PrismaModelDelegate<RawDevice>;
}

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  private readonly prisma: PrismaNotificationClientLike | undefined;

  public constructor(
    @Optional()
    @Inject(PrismaService)
    prisma?: PrismaNotificationClientLike | PrismaService | undefined,
  ) {
    this.prisma = (prisma ?? undefined) as unknown as PrismaNotificationClientLike | undefined;
  }

  private getClient(): PrismaNotificationClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaNotificationRepository. Provide a valid Prisma client or use InMemoryNotificationRepository.',
      );
    }
    return this.prisma;
  }

  private generatePublicId(): string {
    return `NOT-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  public async createNotification(
    data: Omit<
      NotificationEntity,
      'id' | 'publicNotificationId' | 'createdAt' | 'updatedAt' | 'deliveries'
    >,
  ): Promise<NotificationEntity> {
    if (data.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(data.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const client = this.getClient();
    const created = await client.notification.create({
      data: {
        publicNotificationId: this.generatePublicId(),
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        severity: data.severity,
        isRead: data.isRead,
        readAt: data.readAt,
        expiresAt: data.expiresAt,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        idempotencyKey: data.idempotencyKey,
      },
      include: {
        deliveries: true,
      },
    });

    return this.mapNotification(created);
  }

  public async findById(id: string): Promise<NotificationEntity | null> {
    const client = this.getClient();
    const found = await client.notification.findUnique({
      where: { id },
      include: { deliveries: true },
    });
    return found ? this.mapNotification(found) : null;
  }

  public async findByPublicId(publicId: string): Promise<NotificationEntity | null> {
    const client = this.getClient();
    const found = await client.notification.findUnique({
      where: { publicNotificationId: publicId },
      include: { deliveries: true },
    });
    return found ? this.mapNotification(found) : null;
  }

  public async findByIdempotencyKey(key: string): Promise<NotificationEntity | null> {
    const client = this.getClient();
    const found = await client.notification.findUnique({
      where: { idempotencyKey: key },
      include: { deliveries: true },
    });
    return found ? this.mapNotification(found) : null;
  }

  public async findUserNotifications(
    options: NotificationFilterOptions,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const client = this.getClient();
    const where: Record<string, unknown> = { userId: options.userId };
    if (options.isRead !== undefined) {
      where['isRead'] = options.isRead;
    }
    if (options.type) {
      where['type'] = options.type;
    }
    if (options.severity) {
      where['severity'] = options.severity;
    }

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const skip = (page - 1) * limit;

    const countFn = client.notification.count ?? (async () => 0);
    const [total, records] = await Promise.all([
      countFn({ where }),
      client.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { deliveries: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data: records.map((r) => this.mapNotification(r)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  public async countUnread(userId: string): Promise<number> {
    const client = this.getClient();
    const countFn = client.notification.count ?? (async () => 0);
    return countFn({
      where: { userId, isRead: false },
    });
  }

  public async markAsRead(id: string, userId: string): Promise<NotificationEntity | null> {
    const client = this.getClient();
    if (!client.notification.findFirst) return null;
    const existing = await client.notification.findFirst({
      where: { id, userId },
    });
    if (!existing) return null;

    const updated = await client.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
      include: { deliveries: true },
    });
    return this.mapNotification(updated);
  }

  public async markAllAsRead(userId: string): Promise<number> {
    const client = this.getClient();
    if (!client.notification.updateMany) return 0;
    const res = await client.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return res.count;
  }

  public async deleteNotification(id: string, userId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client.notification.findFirst) return false;
    const existing = await client.notification.findFirst({
      where: { id, userId },
    });
    if (!existing) return false;

    await client.notification.delete({ where: { id } });
    return true;
  }

  // --- Deliveries ---

  public async createDelivery(
    data: Omit<NotificationDeliveryEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationDeliveryEntity> {
    const client = this.getClient();
    const created = await client.notificationDelivery.create({
      data: {
        notificationId: data.notificationId,
        channel: data.channel,
        status: data.status,
        provider: data.provider,
        providerMessageId: data.providerMessageId,
        attemptCount: data.attemptCount,
        lastAttemptAt: data.lastAttemptAt,
        deliveredAt: data.deliveredAt,
        failedAt: data.failedAt,
        failureCode: data.failureCode,
        failureReason: data.failureReason,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
    return this.mapDelivery(created);
  }

  public async updateDelivery(
    id: string,
    data: Partial<
      Omit<NotificationDeliveryEntity, 'id' | 'notificationId' | 'createdAt' | 'updatedAt'>
    >,
  ): Promise<NotificationDeliveryEntity> {
    const client = this.getClient();
    const updateData: Record<string, unknown> = { ...data };
    if (data.metadata) updateData['metadata'] = JSON.stringify(data.metadata);

    const updated = await client.notificationDelivery.update({
      where: { id },
      data: updateData,
    });
    return this.mapDelivery(updated);
  }

  public async findDeliveryById(id: string): Promise<NotificationDeliveryEntity | null> {
    const client = this.getClient();
    const found = await client.notificationDelivery.findUnique({
      where: { id },
    });
    return found ? this.mapDelivery(found) : null;
  }

  public async findDeliveriesByNotificationId(
    notificationId: string,
  ): Promise<NotificationDeliveryEntity[]> {
    const client = this.getClient();
    const list = await client.notificationDelivery.findMany({
      where: { notificationId },
    });
    return list.map((item) => this.mapDelivery(item));
  }

  public async findPendingOrFailedDeliveries(
    limit: number = 50,
  ): Promise<NotificationDeliveryEntity[]> {
    const client = this.getClient();
    const list = await client.notificationDelivery.findMany({
      where: {
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.FAILED] },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    return list.map((item) => this.mapDelivery(item));
  }

  // --- Preferences ---

  public async getPreferencesByUserId(
    userId: string,
  ): Promise<NotificationPreferenceEntity | null> {
    const client = this.getClient();
    const found = await client.notificationPreference.findUnique({
      where: { userId },
    });
    return found ? this.mapPreference(found) : null;
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
    const client = this.getClient();
    if (!client.notificationPreference.upsert) {
      throw new Error('Upsert not supported on delegate');
    }
    const upserted = await client.notificationPreference.upsert({
      where: { userId },
      update: {
        ...data,
      },
      create: {
        userId,
        emailEnabled: data.emailEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        smsEnabled: data.smsEnabled ?? false,
        inAppEnabled: data.inAppEnabled ?? true,
        appointmentNotifications: data.appointmentNotifications ?? true,
        wellnessNotifications: data.wellnessNotifications ?? true,
        marketingNotifications: data.marketingNotifications ?? false,
        systemNotifications: data.systemNotifications ?? true,
      },
    });
    return this.mapPreference(upserted);
  }

  // --- Devices ---

  public async registerDevice(
    data: Omit<NotificationDeviceEntity, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<NotificationDeviceEntity> {
    const client = this.getClient();
    if (!client.notificationDevice.upsert) {
      throw new Error('Upsert not supported on delegate');
    }
    const upserted = await client.notificationDevice.upsert({
      where: {
        userId_pushToken: {
          userId: data.userId,
          pushToken: data.pushToken,
        },
      },
      update: {
        active: true,
        lastSeenAt: new Date(),
        deviceId: data.deviceId ?? null,
        platform: data.platform,
      },
      create: {
        userId: data.userId,
        platform: data.platform,
        pushToken: data.pushToken,
        deviceId: data.deviceId,
        active: true,
        lastSeenAt: new Date(),
      },
    });
    return this.mapDevice(upserted);
  }

  public async findDevicesByUserId(
    userId: string,
    activeOnly: boolean = true,
  ): Promise<NotificationDeviceEntity[]> {
    const client = this.getClient();
    const where: Record<string, unknown> = { userId };
    if (activeOnly) {
      where['active'] = true;
    }
    const list = await client.notificationDevice.findMany({ where });
    return list.map((d) => this.mapDevice(d));
  }

  public async findDeviceById(id: string): Promise<NotificationDeviceEntity | null> {
    const client = this.getClient();
    const found = await client.notificationDevice.findUnique({
      where: { id },
    });
    return found ? this.mapDevice(found) : null;
  }

  public async updateDevice(
    id: string,
    data: Partial<Pick<NotificationDeviceEntity, 'active' | 'lastSeenAt'>>,
  ): Promise<NotificationDeviceEntity> {
    const client = this.getClient();
    const updated = await client.notificationDevice.update({
      where: { id },
      data,
    });
    return this.mapDevice(updated);
  }

  public async deleteDevice(id: string, userId: string): Promise<boolean> {
    const client = this.getClient();
    if (!client.notificationDevice.findFirst) return false;
    const existing = await client.notificationDevice.findFirst({
      where: { id, userId },
    });
    if (!existing) return false;

    await client.notificationDevice.delete({ where: { id } });
    return true;
  }

  // --- Mappers ---

  private mapNotification(row: RawNotification): NotificationEntity {
    return {
      id: row.id,
      publicNotificationId: row.publicNotificationId,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      severity: row.severity,
      isRead: row.isRead,
      readAt: row.readAt ? new Date(row.readAt) : null,
      expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      idempotencyKey: row.idempotencyKey,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      deliveries: row.deliveries
        ? row.deliveries.map((d: RawDelivery) => this.mapDelivery(d))
        : undefined,
    };
  }

  private mapDelivery(row: RawDelivery): NotificationDeliveryEntity {
    return {
      id: row.id,
      notificationId: row.notificationId,
      channel: row.channel,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.providerMessageId,
      attemptCount: row.attemptCount,
      lastAttemptAt: row.lastAttemptAt ? new Date(row.lastAttemptAt) : null,
      deliveredAt: row.deliveredAt ? new Date(row.deliveredAt) : null,
      failedAt: row.failedAt ? new Date(row.failedAt) : null,
      failureCode: row.failureCode,
      failureReason: row.failureReason,
      metadata: row.metadata ? JSON.parse(row.metadata) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  private mapPreference(row: RawPreference): NotificationPreferenceEntity {
    return {
      id: row.id,
      userId: row.userId,
      emailEnabled: row.emailEnabled,
      pushEnabled: row.pushEnabled,
      smsEnabled: row.smsEnabled,
      inAppEnabled: row.inAppEnabled,
      appointmentNotifications: row.appointmentNotifications,
      wellnessNotifications: row.wellnessNotifications,
      marketingNotifications: row.marketingNotifications,
      systemNotifications: row.systemNotifications,
      securityNotifications: true, // Non-disableable policy
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  private mapDevice(row: RawDevice): NotificationDeviceEntity {
    return {
      id: row.id,
      userId: row.userId,
      platform: row.platform,
      pushToken: row.pushToken,
      deviceId: row.deviceId,
      active: row.active,
      lastSeenAt: row.lastSeenAt ? new Date(row.lastSeenAt) : null,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
