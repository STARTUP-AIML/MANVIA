import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import { NotificationAuditService } from '../../src/modules/notifications/services/notification-audit.service.js';
import { NotificationsController } from '../../src/modules/notifications/controllers/notifications.controller.js';
import {
  NotificationType,
  NotificationSeverity,
} from '../../src/modules/notifications/enums/index.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { CurrentUserContext } from '../../src/modules/doctors/interfaces/auth-context.interface.js';

describe('NotificationsController (Unit)', () => {
  let repository: InMemoryNotificationRepository;
  let auditService: NotificationAuditService;
  let controller: NotificationsController;

  const USER_1: CurrentUserContext = {
    userId: 'u0000000-0000-0000-0000-000000000001',
    activeRole: 'PATIENT',
  };
  const USER_2: CurrentUserContext = {
    userId: 'u0000000-0000-0000-0000-000000000002',
    activeRole: 'PATIENT',
  };
  const ADMIN: CurrentUserContext = {
    userId: 'u0000000-0000-0000-0000-000000000009',
    activeRole: 'ADMIN',
  };

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    auditService = new NotificationAuditService();
    controller = new NotificationsController(repository, auditService);
  });

  it('lists notifications for authenticated user only', async () => {
    await repository.createNotification({
      userId: USER_1.userId,
      type: NotificationType.APPOINTMENT_CONFIRMED,
      title: 'Apt Confirmed',
      body: 'Your slot is confirmed',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    await repository.createNotification({
      userId: USER_2.userId,
      type: NotificationType.WELLNESS_REMINDER,
      title: 'Wellness',
      body: 'Time to check in',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const user1List = await controller.getNotifications(USER_1, { page: 1, limit: 20 });
    expect(user1List.total).toBe(1);
    expect(user1List.data[0]?.userId).toBe(USER_1.userId);
    expect(user1List.unreadCount).toBe(1);
  });

  it('prevents user from reading or modifying another user’s notification', async () => {
    const notif = await repository.createNotification({
      userId: USER_1.userId,
      type: NotificationType.APPOINTMENT_REQUESTED,
      title: 'Request',
      body: 'Submitted',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    // User 2 tries to access User 1's notification
    await expect(controller.getNotificationById(USER_2, notif.id)).rejects.toThrow(
      ForbiddenException,
    );

    // User 2 tries to mark User 1's notification as read
    await expect(controller.markAsRead(USER_2, notif.id)).rejects.toThrow(ForbiddenException);

    // User 2 tries to delete User 1's notification
    await expect(controller.deleteNotification(USER_2, notif.id)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows admin or notification owner to access notification', async () => {
    const notif = await repository.createNotification({
      userId: USER_1.userId,
      type: NotificationType.WAITLIST_OFFER,
      title: 'Slot available',
      body: 'Grab it now',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const ownerRes = await controller.getNotificationById(USER_1, notif.id);
    expect(ownerRes.id).toBe(notif.id);

    const adminRes = await controller.getNotificationById(ADMIN, notif.id);
    expect(adminRes.id).toBe(notif.id);
  });

  it('marks all notifications as read for current user', async () => {
    await repository.createNotification({
      userId: USER_1.userId,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Reminder 1',
      body: 'Soon',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });
    await repository.createNotification({
      userId: USER_1.userId,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Reminder 2',
      body: 'Very soon',
      severity: NotificationSeverity.INFO,
      isRead: false,
      readAt: null,
      expiresAt: null,
      metadata: null,
      idempotencyKey: null,
    });

    const result = await controller.markAllAsRead(USER_1);
    expect(result.count).toBe(2);

    const unread = await repository.countUnread(USER_1.userId);
    expect(unread).toBe(0);
  });

  it('throws NotFoundException when notification does not exist', async () => {
    await expect(controller.getNotificationById(USER_1, 'non-existent-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
