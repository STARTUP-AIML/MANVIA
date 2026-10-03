import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import { PrismaNotificationRepository } from '../../src/modules/notifications/repositories/prisma-notification.repository.js';
import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  DeliveryStatus,
  DevicePlatform,
} from '../../src/modules/notifications/enums/index.js';

describe('Notification Repositories (Unit Tests)', () => {
  describe('InMemoryNotificationRepository', () => {
    let repo: InMemoryNotificationRepository;

    beforeEach(() => {
      repo = new InMemoryNotificationRepository();
    });

    it('should create notification and return existing one on duplicate idempotency key', async () => {
      const created1 = await repo.createNotification({
        userId: 'usr-1',
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Confirmed',
        body: 'Appointment confirmed',
        severity: NotificationSeverity.SUCCESS,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: 'idem-notif-1',
      });

      expect(created1.id).toBeDefined();
      expect(created1.publicNotificationId).toMatch(/^NOT-/);

      const created2 = await repo.createNotification({
        userId: 'usr-1',
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Duplicate',
        body: 'Duplicate',
        severity: NotificationSeverity.SUCCESS,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: 'idem-notif-1',
      });

      expect(created2.id).toBe(created1.id);
    });

    it('should find by id, publicId, and idempotencyKey', async () => {
      const notif = await repo.createNotification({
        userId: 'usr-lookup',
        type: NotificationType.SYSTEM_NOTIFICATION,
        title: 'System Notice',
        body: 'Notice',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: 'key-system',
      });

      const byId = await repo.findById(notif.id);
      expect(byId?.id).toBe(notif.id);

      const byPublicId = await repo.findByPublicId(notif.publicNotificationId);
      expect(byPublicId?.id).toBe(notif.id);

      const byKey = await repo.findByIdempotencyKey('key-system');
      expect(byKey?.id).toBe(notif.id);

      expect(await repo.findById('missing')).toBeNull();
      expect(await repo.findByPublicId('NOT-MISSING')).toBeNull();
      expect(await repo.findByIdempotencyKey('missing-key')).toBeNull();
    });

    it('should filter user notifications and count unread', async () => {
      await repo.createNotification({
        userId: 'usr-filter',
        type: NotificationType.WAITLIST_OFFER,
        title: 'Offer',
        body: 'You have an offer',
        severity: NotificationSeverity.WARNING,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      await repo.createNotification({
        userId: 'usr-filter',
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Reminder',
        body: 'Upcoming appt',
        severity: NotificationSeverity.INFO,
        isRead: true,
        readAt: new Date(),
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const unreadCount = await repo.countUnread('usr-filter');
      expect(unreadCount).toBe(1);

      const filtered = await repo.findUserNotifications({
        userId: 'usr-filter',
        isRead: false,
        type: NotificationType.WAITLIST_OFFER,
        severity: NotificationSeverity.WARNING,
        page: 1,
        limit: 10,
      });

      expect(filtered.total).toBe(1);
      expect(filtered.data[0]?.type).toBe(NotificationType.WAITLIST_OFFER);
    });

    it('should mark single and all notifications as read, and delete', async () => {
      const n1 = await repo.createNotification({
        userId: 'usr-read',
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'R1',
        body: 'B1',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const n2 = await repo.createNotification({
        userId: 'usr-read',
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'R2',
        body: 'B2',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const marked = await repo.markAsRead(n1.id, 'usr-read');
      expect(marked?.isRead).toBe(true);
      expect(marked?.readAt).toBeDefined();

      const notFoundMark = await repo.markAsRead('missing-id', 'usr-read');
      expect(notFoundMark).toBeNull();

      const readAllCount = await repo.markAllAsRead('usr-read');
      expect(readAllCount).toBe(1); // n2 was unread

      const deleted = await repo.deleteNotification(n2.id, 'usr-read');
      expect(deleted).toBe(true);

      const deleteAgain = await repo.deleteNotification(n2.id, 'usr-read');
      expect(deleteAgain).toBe(false);
    });

    it('should handle deliveries lifecycle', async () => {
      const del = await repo.createDelivery({
        notificationId: 'notif-1',
        channel: NotificationChannel.EMAIL,
        status: DeliveryStatus.PENDING,
        provider: 'simulated-email',
        providerMessageId: null,
        attemptCount: 0,
        lastAttemptAt: null,
        deliveredAt: null,
        failedAt: null,
        failureCode: null,
        failureReason: null,
        metadata: null,
      });

      expect(del.id).toBeDefined();

      const byId = await repo.findDeliveryById(del.id);
      expect(byId?.id).toBe(del.id);

      const byNotif = await repo.findDeliveriesByNotificationId('notif-1');
      expect(byNotif).toHaveLength(1);

      const updated = await repo.updateDelivery(del.id, {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
      });
      expect(updated.status).toBe(DeliveryStatus.DELIVERED);

      await expect(repo.updateDelivery('bad-id', {})).rejects.toThrow('Delivery not found');

      const pendingList = await repo.findPendingOrFailedDeliveries();
      expect(pendingList).toHaveLength(0);
    });

    it('should upsert user preferences enforcing security notifications invariant', async () => {
      const initial = await repo.upsertPreferences('usr-pref', {
        emailEnabled: true,
        smsEnabled: true,
      });

      expect(initial.emailEnabled).toBe(true);
      expect(initial.securityNotifications).toBe(true);

      const updated = await repo.upsertPreferences('usr-pref', {
        emailEnabled: false,
      });

      expect(updated.emailEnabled).toBe(false);
      expect(updated.securityNotifications).toBe(true); // Must remain true

      const fetched = await repo.getPreferencesByUserId('usr-pref');
      expect(fetched?.emailEnabled).toBe(false);

      const missing = await repo.getPreferencesByUserId('usr-missing');
      expect(missing).toBeNull();
    });

    it('should register, retrieve, and deactivate devices', async () => {
      const dev = await repo.registerDevice({
        userId: 'usr-dev',
        platform: DevicePlatform.IOS,
        pushToken: 'push-ios-token',
        deviceId: 'device-id-1',
        active: true,
        lastSeenAt: new Date(),
      });

      expect(dev.active).toBe(true);

      const list = await repo.findDevicesByUserId('usr-dev');
      expect(list).toHaveLength(1);

      await repo.updateDevice(dev.id, { active: false });
      const afterDeact = await repo.findDevicesByUserId('usr-dev');
      expect(afterDeact).toHaveLength(0);

      // Re-register
      await repo.registerDevice({
        userId: 'usr-dev',
        platform: DevicePlatform.ANDROID,
        pushToken: 'push-android-token',
        deviceId: 'device-id-2',
        active: true,
        lastSeenAt: new Date(),
      });

      const allDevices = await repo.findDevicesByUserId('usr-dev', false);
      expect(allDevices.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PrismaNotificationRepository', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockPrisma: any;
    let repo: PrismaNotificationRepository;

    const mockRawNotif = {
      id: 'notif-uuid-1',
      publicNotificationId: 'NOT-1234ABCD',
      userId: 'usr-uuid-1',
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: 'Confirmed',
      body: 'Body text',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: 'idem-key',
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
      deliveries: [],
    };

    const mockRawDelivery = {
      id: 'del-uuid-1',
      notificationId: 'notif-uuid-1',
      channel: NotificationChannel.EMAIL,
      status: DeliveryStatus.PENDING,
      provider: 'simulated-email',
      providerMessageId: 'msg-1',
      attemptCount: 1,
      lastAttemptAt: new Date('2026-09-30'),
      deliveredAt: null,
      failedAt: null,
      failureCode: null,
      failureReason: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    const mockRawPref = {
      id: 'pref-uuid-1',
      userId: 'usr-uuid-1',
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      appointmentNotifications: true,
      wellnessNotifications: true,
      marketingNotifications: false,
      systemNotifications: true,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    const mockRawDevice = {
      id: 'dev-uuid-1',
      userId: 'usr-uuid-1',
      platform: DevicePlatform.IOS,
      pushToken: 'push-tok',
      deviceId: 'dev-1',
      active: true,
      lastSeenAt: new Date('2026-09-30'),
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    beforeEach(() => {
      mockPrisma = {
        notification: {
          create: vi.fn().mockResolvedValue(mockRawNotif),
          findUnique: vi.fn().mockResolvedValue(mockRawNotif),
          findFirst: vi.fn().mockResolvedValue(mockRawNotif),
          findMany: vi.fn().mockResolvedValue([mockRawNotif]),
          update: vi.fn().mockResolvedValue({ ...mockRawNotif, isRead: true }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          delete: vi.fn().mockResolvedValue(mockRawNotif),
          count: vi.fn().mockResolvedValue(1),
        },
        notificationDelivery: {
          create: vi.fn().mockResolvedValue(mockRawDelivery),
          findUnique: vi.fn().mockResolvedValue(mockRawDelivery),
          findMany: vi.fn().mockResolvedValue([mockRawDelivery]),
          update: vi
            .fn()
            .mockResolvedValue({ ...mockRawDelivery, status: DeliveryStatus.DELIVERED }),
        },
        notificationPreference: {
          findUnique: vi.fn().mockResolvedValue(mockRawPref),
          upsert: vi.fn().mockResolvedValue(mockRawPref),
        },
        notificationDevice: {
          create: vi.fn().mockResolvedValue(mockRawDevice),
          findMany: vi.fn().mockResolvedValue([mockRawDevice]),
          findUnique: vi.fn().mockResolvedValue(mockRawDevice),
          findFirst: vi.fn().mockResolvedValue(mockRawDevice),
          update: vi.fn().mockResolvedValue({ ...mockRawDevice, active: false }),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          delete: vi.fn().mockResolvedValue(mockRawDevice),
          upsert: vi.fn().mockResolvedValue(mockRawDevice),
        },
      };
      repo = new PrismaNotificationRepository(mockPrisma);
    });

    it('should throw when PrismaClient is not initialized', async () => {
      const uninit = new PrismaNotificationRepository();
      await expect(
        uninit.createNotification({
          userId: 'u',
          type: NotificationType.SYSTEM_NOTIFICATION,
          title: 't',
          body: 'b',
          severity: NotificationSeverity.INFO,
          isRead: false,
          readAt: null,
          expiresAt: null,
          metadata: null,
          idempotencyKey: null,
        }),
      ).rejects.toThrow('PrismaClient is not initialized in PrismaNotificationRepository');
    });

    it('should create and find notifications with Prisma', async () => {
      const created = await repo.createNotification({
        userId: 'usr-uuid-1',
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Confirmed',
        body: 'Body text',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: 'idem-key',
      });

      expect(created.publicNotificationId).toBe('NOT-1234ABCD');

      const byId = await repo.findById('notif-uuid-1');
      expect(byId?.id).toBe('notif-uuid-1');

      const byPublicId = await repo.findByPublicId('NOT-1234ABCD');
      expect(byPublicId?.publicNotificationId).toBe('NOT-1234ABCD');

      const byKey = await repo.findByIdempotencyKey('idem-key');
      expect(byKey?.id).toBe('notif-uuid-1');
    });

    it('should filter notifications, mark read, and delete', async () => {
      const paginated = await repo.findUserNotifications({
        userId: 'usr-uuid-1',
        isRead: false,
        type: NotificationType.APPOINTMENT_CONFIRMED,
        severity: NotificationSeverity.INFO,
        page: 1,
        limit: 10,
      });
      expect(paginated.total).toBe(1);

      const unread = await repo.countUnread('usr-uuid-1');
      expect(unread).toBe(1);

      const marked = await repo.markAsRead('notif-uuid-1', 'usr-uuid-1');
      expect(marked?.isRead).toBe(true);

      const allCount = await repo.markAllAsRead('usr-uuid-1');
      expect(allCount).toBe(1);

      const deleted = await repo.deleteNotification('notif-uuid-1', 'usr-uuid-1');
      expect(deleted).toBe(true);
    });

    it('should manage deliveries, preferences, and devices', async () => {
      const del = await repo.createDelivery({
        notificationId: 'notif-uuid-1',
        channel: NotificationChannel.EMAIL,
        status: DeliveryStatus.PENDING,
        provider: 'simulated-email',
        providerMessageId: 'msg-1',
        attemptCount: 1,
        lastAttemptAt: new Date(),
        deliveredAt: null,
        failedAt: null,
        failureCode: null,
        failureReason: null,
        metadata: null,
      });
      expect(del.id).toBe('del-uuid-1');

      const updatedDel = await repo.updateDelivery('del-uuid-1', {
        status: DeliveryStatus.DELIVERED,
      });
      expect(updatedDel.status).toBe(DeliveryStatus.DELIVERED);

      const pref = await repo.upsertPreferences('usr-uuid-1', {
        emailEnabled: true,
      });
      expect(pref.emailEnabled).toBe(true);

      const dev = await repo.registerDevice({
        userId: 'usr-uuid-1',
        platform: DevicePlatform.IOS,
        pushToken: 'push-tok',
        deviceId: 'dev-1',
        active: true,
        lastSeenAt: new Date(),
      });
      expect(dev.active).toBe(true);

      const userDevices = await repo.findDevicesByUserId('usr-uuid-1');
      expect(userDevices).toHaveLength(1);

      const byId = await repo.findDeviceById('dev-uuid-1');
      expect(byId?.id).toBe('dev-uuid-1');

      await repo.updateDevice('dev-uuid-1', { active: false });
      expect(mockPrisma.notificationDevice.update).toHaveBeenCalled();

      const deleted = await repo.deleteDevice('dev-uuid-1', 'usr-uuid-1');
      expect(deleted).toBe(true);
    });
  });
});
