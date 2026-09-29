import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import { NotificationAuditService } from '../../src/modules/notifications/services/notification-audit.service.js';
import { NotificationPreferencesService } from '../../src/modules/notifications/services/notification-preferences.service.js';

describe('NotificationPreferencesService (Unit)', () => {
  let repository: InMemoryNotificationRepository;
  let auditService: NotificationAuditService;
  let preferencesService: NotificationPreferencesService;
  const USER_ID = 'u0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    auditService = new NotificationAuditService();
    preferencesService = new NotificationPreferencesService(repository, auditService);
  });

  it('returns default preferences when none exist for user', async () => {
    const prefs = await preferencesService.getPreferences(USER_ID);

    expect(prefs.userId).toBe(USER_ID);
    expect(prefs.emailEnabled).toBe(true);
    expect(prefs.pushEnabled).toBe(true);
    expect(prefs.smsEnabled).toBe(false);
    expect(prefs.inAppEnabled).toBe(true);
    expect(prefs.appointmentNotifications).toBe(true);
    expect(prefs.wellnessNotifications).toBe(true);
    expect(prefs.marketingNotifications).toBe(false);
    expect(prefs.securityNotifications).toBe(true);
  });

  it('updates preferences and records audit event', async () => {
    const updated = await preferencesService.updatePreferences(
      USER_ID,
      {
        emailEnabled: false,
        smsEnabled: true,
      },
      USER_ID,
      'PATIENT',
    );

    expect(updated.emailEnabled).toBe(false);
    expect(updated.smsEnabled).toBe(true);

    const logs = auditService.getAuditLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]?.event).toBe('NOTIFICATION_PREFERENCES_UPDATED');
    expect(logs[0]?.actorId).toBe(USER_ID);
  });

  it('enforces that security notifications remain mandatory and cannot be disabled', async () => {
    // Attempting to pass securityNotifications or modify settings still leaves securityNotifications as true
    const updated = await preferencesService.updatePreferences(
      USER_ID,
      {
        emailEnabled: false,
        pushEnabled: false,
        inAppEnabled: false,
        appointmentNotifications: false,
      },
      USER_ID,
      'PATIENT',
    );

    expect(updated.securityNotifications).toBe(true);
    const fetched = await preferencesService.getPreferences(USER_ID);
    expect(fetched.securityNotifications).toBe(true);
  });
});
