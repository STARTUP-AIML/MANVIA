import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import { NotificationAuditService } from '../../src/modules/notifications/services/notification-audit.service.js';
import { NotificationDeviceService } from '../../src/modules/notifications/services/notification-device.service.js';
import { DevicePlatform } from '../../src/modules/notifications/enums/index.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('NotificationDeviceService (Unit)', () => {
  let repository: InMemoryNotificationRepository;
  let auditService: NotificationAuditService;
  let deviceService: NotificationDeviceService;
  const USER_1 = 'u0000000-0000-0000-0000-000000000001';
  const USER_2 = 'u0000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    auditService = new NotificationAuditService();
    deviceService = new NotificationDeviceService(repository, auditService);
  });

  it('registers a device token and audits registration', async () => {
    const device = await deviceService.registerDevice(USER_1, {
      platform: DevicePlatform.ANDROID,
      pushToken: 'fcm-secret-token-12345',
      deviceId: 'android-hw-001',
    });

    expect(device.id).toBeDefined();
    expect(device.userId).toBe(USER_1);
    expect(device.platform).toBe(DevicePlatform.ANDROID);
    expect(device.active).toBe(true);

    const logs = auditService.getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]?.event).toBe('DEVICE_REGISTERED');
    // Audit must redact push token
    expect(logs[0]?.metadata?.pushToken).toBe('***REDACTED***');
  });

  it('updates existing device registration idempotently when re-registered', async () => {
    const d1 = await deviceService.registerDevice(USER_1, {
      platform: DevicePlatform.IOS,
      pushToken: 'apns-token-abc',
      deviceId: 'iphone-hw-1',
    });

    const d2 = await deviceService.registerDevice(USER_1, {
      platform: DevicePlatform.IOS,
      pushToken: 'apns-token-abc',
      deviceId: 'iphone-hw-1',
    });

    expect(d1.id).toBe(d2.id);
    const devices = await deviceService.getActiveDevices(USER_1);
    expect(devices.length).toBe(1);
  });

  it('prevents user from modifying or removing another user’s device', async () => {
    const device = await deviceService.registerDevice(USER_1, {
      platform: DevicePlatform.WEB,
      pushToken: 'web-push-token-xyz',
    });

    await expect(deviceService.updateDeviceStatus(device.id, USER_2, false)).rejects.toThrow(
      ForbiddenException,
    );

    await expect(deviceService.removeDevice(device.id, USER_2)).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFoundException when device does not exist', async () => {
    await expect(deviceService.removeDevice('non-existent-device-id', USER_1)).rejects.toThrow(
      NotFoundException,
    );
  });
});
