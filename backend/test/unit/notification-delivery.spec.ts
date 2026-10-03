import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import {
  SimulatedEmailProvider,
  SimulatedPushProvider,
  SimulatedSmsProvider,
} from '../../src/modules/notifications/providers/simulated-providers.js';
import { NotificationDeliveryService } from '../../src/modules/notifications/services/notification-delivery.service.js';
import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  DeliveryStatus,
} from '../../src/modules/notifications/enums/index.js';

describe('NotificationDeliveryService (Unit)', () => {
  let repository: InMemoryNotificationRepository;
  let emailProvider: SimulatedEmailProvider;
  let pushProvider: SimulatedPushProvider;
  let smsProvider: SimulatedSmsProvider;
  let deliveryService: NotificationDeliveryService;

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    emailProvider = new SimulatedEmailProvider();
    pushProvider = new SimulatedPushProvider();
    smsProvider = new SimulatedSmsProvider();
    deliveryService = new NotificationDeliveryService(
      repository,
      emailProvider,
      pushProvider,
      smsProvider,
    );
  });

  it('successfully delivers email notification', async () => {
    const notif = await repository.createNotification({
      userId: 'u1',
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: 'Confirmed',
      body: 'Your appointment is confirmed',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const delivery = await deliveryService.dispatchChannel({
      notification: notif,
      channel: NotificationChannel.EMAIL,
      recipientEmail: 'patient@example.com',
    });

    expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
    expect(delivery.provider).toBe('simulated-email');
    expect(emailProvider.sentEmails.length).toBe(1);
    expect(emailProvider.sentEmails[0]?.recipientEmail).toBe('patient@example.com');
  });

  it('marks delivery as FAILED on transient failure, allows retry up to MAX_RETRIES', async () => {
    const notif = await repository.createNotification({
      userId: 'u1',
      type: NotificationType.SECURITY_LOGIN,
      title: 'New Login',
      body: 'Sign in detected',
      severity: NotificationSeverity.WARNING,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    // Make next attempt fail transiently
    emailProvider.failNextWithTransient = true;

    const delivery = await deliveryService.dispatchChannel({
      notification: notif,
      channel: NotificationChannel.EMAIL,
      recipientEmail: 'patient@example.com',
    });

    expect(delivery.status).toBe(DeliveryStatus.FAILED);
    expect(delivery.failureCode).toBe('TIMEOUT_ERROR');
    expect(delivery.attemptCount).toBe(1);

    // Now retry delivery
    const retried = await deliveryService.retryDelivery(delivery.id, {
      email: 'patient@example.com',
    });

    expect(retried.status).toBe(DeliveryStatus.DELIVERED);
    expect(retried.attemptCount).toBe(2);
  });

  it('enforces bounded retries and prevents retrying past MAX_RETRIES', async () => {
    const notif = await repository.createNotification({
      userId: 'u1',
      type: NotificationType.REFUND_COMPLETED,
      title: 'Refunded',
      body: 'Refund issued',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const delivery = await repository.createDelivery({
      notificationId: notif.id,
      channel: NotificationChannel.EMAIL,
      status: DeliveryStatus.FAILED,
      provider: 'simulated-email',
      providerMessageId: null,
      attemptCount: 3, // Already at MAX_RETRIES
      lastAttemptAt: new Date(),
      deliveredAt: null,
      failedAt: new Date(),
      failureCode: 'PERMANENT_ERROR',
      failureReason: 'Mailbox rejected',
      metadata: null,
    });

    await expect(
      deliveryService.retryDelivery(delivery.id, { email: 'test@example.com' }),
    ).rejects.toThrow(/Max retry limit/);
  });

  it('delivers in-app notifications instantly', async () => {
    const notif = await repository.createNotification({
      userId: 'u2',
      type: NotificationType.APPOINTMENT_REQUESTED,
      title: 'Requested',
      body: 'Appointment is pending review',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const delivery = await deliveryService.dispatchChannel({
      notification: notif,
      channel: NotificationChannel.IN_APP,
    });

    expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
    expect(delivery.provider).toBe('internal-inapp');
    expect(delivery.providerMessageId).toBe(notif.publicNotificationId);
  });

  it('fails email delivery when recipientEmail is missing', async () => {
    const notif = await repository.createNotification({
      userId: 'u3',
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: 'Confirmed',
      body: 'Appointment is confirmed',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const delivery = await deliveryService.dispatchChannel({
      notification: notif,
      channel: NotificationChannel.EMAIL,
    });

    expect(delivery.status).toBe(DeliveryStatus.FAILED);
    expect(delivery.failureCode).toBe('MISSING_RECIPIENT_EMAIL');
  });

  describe('PUSH notifications', () => {
    it('fails push delivery when pushTokens is empty', async () => {
      const notif = await repository.createNotification({
        userId: 'u4',
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Cancelled',
        body: 'Appointment cancelled',
        severity: NotificationSeverity.WARNING,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const delivery = await deliveryService.dispatchChannel({
        notification: notif,
        channel: NotificationChannel.PUSH,
        pushTokens: [],
      });

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureCode).toBe('NO_ACTIVE_DEVICES');
    });

    it('successfully delivers push when tokens exist', async () => {
      const notif = await repository.createNotification({
        userId: 'u5',
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Reminder',
        body: 'Appointment tomorrow',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const delivery = await deliveryService.dispatchChannel({
        notification: notif,
        channel: NotificationChannel.PUSH,
        pushTokens: ['fcm-token-12345678'],
      });

      expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
      expect(delivery.provider).toBe('simulated-push');
    });

    it('marks push FAILED when push provider fails', async () => {
      const notif = await repository.createNotification({
        userId: 'u6',
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Cancelled',
        body: 'Cancelled',
        severity: NotificationSeverity.WARNING,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      pushProvider.failNextWithTransient = true;

      const delivery = await deliveryService.dispatchChannel({
        notification: notif,
        channel: NotificationChannel.PUSH,
        pushTokens: ['token-fail-1234'],
      });

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureCode).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('SMS notifications', () => {
    it('fails SMS delivery when phone number is missing', async () => {
      const notif = await repository.createNotification({
        userId: 'u7',
        type: NotificationType.SECURITY_LOGIN,
        title: 'Login',
        body: 'Login OTP code',
        severity: NotificationSeverity.CRITICAL,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const delivery = await deliveryService.dispatchChannel({
        notification: notif,
        channel: NotificationChannel.SMS,
      });

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureCode).toBe('MISSING_PHONE_NUMBER');
    });

    it('delivers SMS successfully when phone number is provided', async () => {
      const notif = await repository.createNotification({
        userId: 'u8',
        type: NotificationType.SECURITY_LOGIN,
        title: 'Security Alert',
        body: 'Code 123456',
        severity: NotificationSeverity.CRITICAL,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const delivery = await deliveryService.dispatchChannel({
        notification: notif,
        channel: NotificationChannel.SMS,
        recipientPhone: '+1234567890',
      });

      expect(delivery.status).toBe(DeliveryStatus.DELIVERED);
      expect(delivery.provider).toBe('simulated-sms');
    });

    it('fails SMS delivery when SMS provider fails', async () => {
      const notif = await repository.createNotification({
        userId: 'u9',
        type: NotificationType.SECURITY_LOGIN,
        title: 'Alert',
        body: 'Alert text',
        severity: NotificationSeverity.CRITICAL,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      smsProvider.failNextWithTransient = true;

      const delivery = await deliveryService.dispatchChannel({
        notification: notif,
        channel: NotificationChannel.SMS,
        recipientPhone: '+1234567890',
      });

      expect(delivery.status).toBe(DeliveryStatus.FAILED);
      expect(delivery.failureCode).toBe('GATEWAY_TIMEOUT');
    });
  });

  describe('retry error cases', () => {
    it('throws error when retrying non-existent delivery', async () => {
      await expect(deliveryService.retryDelivery('non-existent-delivery')).rejects.toThrow(
        /Delivery not found/,
      );
    });

    it('throws error when associated notification not found', async () => {
      const delivery = await repository.createDelivery({
        notificationId: 'missing-notification-id',
        channel: NotificationChannel.EMAIL,
        status: DeliveryStatus.FAILED,
        provider: 'simulated-email',
        providerMessageId: null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
        deliveredAt: null,
        failedAt: new Date(),
        failureCode: 'FAIL',
        failureReason: 'Fail',
        metadata: null,
      });

      await expect(
        deliveryService.retryDelivery(delivery.id, { email: 'a@b.com' }),
      ).rejects.toThrow(/Notification not found for delivery/);
    });
  });
});
