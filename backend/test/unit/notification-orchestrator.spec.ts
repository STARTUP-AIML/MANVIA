import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryNotificationRepository } from '../../src/modules/notifications/repositories/in-memory-notification.repository.js';
import { NotificationAuditService } from '../../src/modules/notifications/services/notification-audit.service.js';
import { TemplateEngineService } from '../../src/modules/notifications/services/template-engine.service.js';
import { NotificationPreferencesService } from '../../src/modules/notifications/services/notification-preferences.service.js';
import {
  SimulatedEmailProvider,
  SimulatedPushProvider,
  SimulatedSmsProvider,
} from '../../src/modules/notifications/providers/simulated-providers.js';
import { NotificationDeliveryService } from '../../src/modules/notifications/services/notification-delivery.service.js';
import { NotificationOrchestratorService } from '../../src/modules/notifications/services/notification-orchestrator.service.js';
import {
  NotificationType,
  NotificationChannel,
  DeliveryStatus,
} from '../../src/modules/notifications/enums/index.js';
import type { IDomainEvent } from '../../src/events/event-bus.interface.js';

describe('NotificationOrchestratorService (Unit & Event Integration)', () => {
  let repository: InMemoryNotificationRepository;
  let auditService: NotificationAuditService;
  let templateEngine: TemplateEngineService;
  let preferencesService: NotificationPreferencesService;
  let emailProvider: SimulatedEmailProvider;
  let pushProvider: SimulatedPushProvider;
  let smsProvider: SimulatedSmsProvider;
  let deliveryService: NotificationDeliveryService;
  let orchestrator: NotificationOrchestratorService;

  const PATIENT_ID = 'u0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    repository = new InMemoryNotificationRepository();
    auditService = new NotificationAuditService();
    templateEngine = new TemplateEngineService();
    preferencesService = new NotificationPreferencesService(repository, auditService);
    emailProvider = new SimulatedEmailProvider();
    pushProvider = new SimulatedPushProvider();
    smsProvider = new SimulatedSmsProvider();
    deliveryService = new NotificationDeliveryService(
      repository,
      emailProvider,
      pushProvider,
      smsProvider,
    );
    orchestrator = new NotificationOrchestratorService(
      repository,
      auditService,
      templateEngine,
      preferencesService,
      deliveryService,
    );
  });

  it('orchestrates APPOINTMENT_CONFIRMED event across in-app and email channels', async () => {
    const event: IDomainEvent = {
      eventId: 'evt-apt-101',
      eventType: 'APPOINTMENT_CONFIRMED',
      aggregateId: 'apt-001',
      occurredAt: new Date(),
      payload: {
        patientId: PATIENT_ID,
        patientName: 'Alice',
        doctorName: 'Dr. Gregory House',
        startTime: '2026-10-20T10:00:00.000Z',
        email: 'alice@example.com',
      },
    };

    const notif = await orchestrator.handleDomainEvent(event);

    expect(notif).toBeDefined();
    expect(notif?.type).toBe(NotificationType.APPOINTMENT_CONFIRMED);
    expect(notif?.title).toBe('Appointment Confirmed');
    expect(notif?.body).toContain('Dr. Gregory House');

    // Deliveries: IN_APP + EMAIL + PUSH (default preferences have inApp, email, push enabled)
    const deliveries = await repository.findDeliveriesByNotificationId(notif!.id);
    expect(deliveries.length).toBe(3);

    const inAppDel = deliveries.find((d) => d.channel === NotificationChannel.IN_APP);
    expect(inAppDel?.status).toBe(DeliveryStatus.DELIVERED);

    const emailDel = deliveries.find((d) => d.channel === NotificationChannel.EMAIL);
    expect(emailDel?.status).toBe(DeliveryStatus.DELIVERED);
    expect(emailProvider.sentEmails.length).toBe(1);
  });

  it('guarantees deterministic idempotency when same domain event is received twice', async () => {
    const event: IDomainEvent = {
      eventId: 'evt-dup-202',
      eventType: 'REFUND_COMPLETED',
      aggregateId: 'ref-001',
      occurredAt: new Date(),
      payload: {
        patientId: PATIENT_ID,
        amount: 150,
        currency: 'USD',
        email: 'alice@example.com',
      },
    };

    const first = await orchestrator.handleDomainEvent(event);
    const second = await orchestrator.handleDomainEvent(event);

    expect(first?.id).toBe(second?.id);
    expect(first?.publicNotificationId).toBe(second?.publicNotificationId);
    expect(repository.notifications.length).toBe(1);
  });

  it('delivers mandatory SECURITY_LOGIN notification even when user email preference is disabled', async () => {
    // Disable all preferences
    await preferencesService.updatePreferences(
      PATIENT_ID,
      {
        emailEnabled: false,
        pushEnabled: false,
        inAppEnabled: false,
      },
      PATIENT_ID,
      'PATIENT',
    );

    const securityEvent: IDomainEvent = {
      eventId: 'evt-sec-303',
      eventType: 'SECURITY_LOGIN',
      aggregateId: PATIENT_ID,
      occurredAt: new Date(),
      payload: {
        userId: PATIENT_ID,
        userName: 'Alice',
        location: 'New York, USA',
        email: 'alice@example.com',
      },
    };

    const notif = await orchestrator.handleDomainEvent(securityEvent);

    expect(notif?.type).toBe(NotificationType.SECURITY_LOGIN);
    // Security policy enforces delivery on IN_APP and EMAIL regardless of preference switches
    const deliveries = await repository.findDeliveriesByNotificationId(notif!.id);
    expect(deliveries.some((d) => d.channel === NotificationChannel.EMAIL)).toBe(true);
    expect(emailProvider.sentEmails.length).toBe(1);
  });
});
