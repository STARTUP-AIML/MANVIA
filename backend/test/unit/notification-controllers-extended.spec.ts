import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationPreferencesController } from '../../src/modules/notifications/controllers/notification-preferences.controller.js';
import { NotificationPreferencesService } from '../../src/modules/notifications/services/notification-preferences.service.js';
import { NotificationDevicesController } from '../../src/modules/notifications/controllers/notification-devices.controller.js';
import { NotificationDeviceService } from '../../src/modules/notifications/services/notification-device.service.js';
import { AdminNotificationDeliveriesController } from '../../src/modules/notifications/controllers/admin-notification-deliveries.controller.js';
import { NotificationDeliveryService } from '../../src/modules/notifications/services/notification-delivery.service.js';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import { NotificationAuditService } from '../../src/modules/notifications/services/notification-audit.service.js';
import {
  NotificationChannel,
  NotificationSeverity,
  NotificationType,
  DevicePlatform,
  DeliveryStatus,
} from '../../src/modules/notifications/enums/index.js';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Notification Controllers (Preferences, Devices, Admin Deliveries)', () => {
  let repository: InMemoryNotificationRepository;
  let auditService: NotificationAuditService;
  let preferencesService: NotificationPreferencesService;
  let preferencesController: NotificationPreferencesController;
  let deviceService: NotificationDeviceService;
  let devicesController: NotificationDevicesController;
  let deliveryService: NotificationDeliveryService;
  let adminDeliveriesController: AdminNotificationDeliveriesController;

  const PATIENT_USER: CurrentUserContext = {
    userId: 'u0000000-0000-0000-0000-000000000001',
    activeRole: 'PATIENT',
  };
  const ADMIN_USER: CurrentUserContext = {
    userId: 'u0000000-0000-0000-0000-000000000009',
    activeRole: 'ADMIN',
  };

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    auditService = new NotificationAuditService();
    preferencesService = new NotificationPreferencesService(repository, auditService);
    preferencesController = new NotificationPreferencesController(preferencesService);

    deviceService = new NotificationDeviceService(repository, auditService);
    devicesController = new NotificationDevicesController(deviceService);

    const emailProvider = {
      providerName: 'mock-email',
      send: vi.fn().mockResolvedValue({ success: true, provider: 'mock-email' }),
    };
    const pushProvider = {
      providerName: 'mock-push',
      send: vi.fn().mockResolvedValue({ success: true, provider: 'mock-push' }),
    };
    const smsProvider = {
      providerName: 'mock-sms',
      send: vi.fn().mockResolvedValue({ success: true, provider: 'mock-sms' }),
    };
    deliveryService = new NotificationDeliveryService(
      repository,
      emailProvider,
      pushProvider,
      smsProvider,
    );
    adminDeliveriesController = new AdminNotificationDeliveriesController(
      repository,
      auditService,
      deliveryService,
    );
  });

  describe('NotificationPreferencesController', () => {
    it('gets default preferences for authenticated user', async () => {
      const prefs = await preferencesController.getPreferences(PATIENT_USER);
      expect(prefs.userId).toBe(PATIENT_USER.userId);
      expect(prefs.emailEnabled).toBe(true);
      expect(prefs.securityNotifications).toBe(true);
    });

    it('updates preferences for authenticated user', async () => {
      const updated = await preferencesController.updatePreferences(PATIENT_USER, {
        emailEnabled: false,
        smsEnabled: true,
      });
      expect(updated.emailEnabled).toBe(false);
      expect(updated.smsEnabled).toBe(true);
      expect(updated.securityNotifications).toBe(true);
    });
  });

  describe('NotificationDevicesController', () => {
    it('registers and lists devices for user', async () => {
      const registered = await devicesController.registerDevice(PATIENT_USER, {
        platform: DevicePlatform.ANDROID,
        pushToken: 'push-token-test-123',
        deviceId: 'hw-android-1',
      });
      expect(registered.id).toBeDefined();
      expect(registered.platform).toBe(DevicePlatform.ANDROID);

      const list = await devicesController.getDevices(PATIENT_USER);
      expect(list.length).toBe(1);
      expect(list[0]?.id).toBe(registered.id);
    });

    it('updates device active state', async () => {
      const registered = await devicesController.registerDevice(PATIENT_USER, {
        platform: DevicePlatform.IOS,
        pushToken: 'push-token-ios-456',
      });

      const updated = await devicesController.updateDevice(PATIENT_USER, registered.id, {
        active: false,
      });
      expect(updated.active).toBe(false);
    });

    it('unregisters device', async () => {
      const registered = await devicesController.registerDevice(PATIENT_USER, {
        platform: DevicePlatform.WEB,
        pushToken: 'push-token-web-789',
      });

      const res = await devicesController.removeDevice(PATIENT_USER, registered.id);
      expect(res.success).toBe(true);

      const list = await devicesController.getDevices(PATIENT_USER);
      expect(list.length).toBe(0);
    });
  });

  describe('AdminNotificationDeliveriesController', () => {
    it('allows admin to list pending or failed deliveries', async () => {
      const notif = await repository.createNotification({
        userId: PATIENT_USER.userId,
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Title',
        body: 'Body',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      await repository.createDelivery({
        notificationId: notif.id,
        channel: NotificationChannel.EMAIL,
        status: DeliveryStatus.FAILED,
        provider: 'mock-email',
        providerMessageId: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        deliveredAt: null,
        failedAt: new Date(),
        failureCode: 'FAIL',
        failureReason: 'Network error',
        metadata: null,
      });

      const deliveries = await adminDeliveriesController.getDeliveries(ADMIN_USER);
      expect(deliveries.length).toBe(1);
      expect(deliveries[0]?.status).toBe(DeliveryStatus.FAILED);
    });

    it('rejects non-admin users from accessing deliveries', async () => {
      await expect(adminDeliveriesController.getDeliveries(PATIENT_USER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows admin to retry failed delivery', async () => {
      const notif = await repository.createNotification({
        userId: PATIENT_USER.userId,
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Title',
        body: 'Body',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const del = await repository.createDelivery({
        notificationId: notif.id,
        channel: NotificationChannel.EMAIL,
        status: DeliveryStatus.FAILED,
        provider: 'mock-email',
        providerMessageId: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        deliveredAt: null,
        failedAt: new Date(),
        failureCode: 'FAIL',
        failureReason: 'Network error',
        metadata: null,
      });

      const retried = await adminDeliveriesController.retryDelivery(ADMIN_USER, del.id);
      expect(retried.status).toBe(DeliveryStatus.FAILED); // Missing recipientEmail in retry payload results in failed without email
    });

    it('throws NotFoundException on non-existent delivery retry', async () => {
      await expect(
        adminDeliveriesController.retryDelivery(ADMIN_USER, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
