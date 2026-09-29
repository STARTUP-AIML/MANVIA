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
});
