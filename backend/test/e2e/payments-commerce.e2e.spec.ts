import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createHmac } from 'crypto';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { DOCTOR_AVAILABILITY_REPOSITORY } from '../../src/modules/doctor-availability/interfaces/availability-repository.interface.js';
import type { IDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/interfaces/availability-repository.interface.js';
import { NOTIFICATION_REPOSITORY } from '../../src/modules/notifications/interfaces/notification-repository.interface.js';
import type { INotificationRepository } from '../../src/modules/notifications/interfaces/notification-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import {
  NotificationType,
  NotificationSeverity,
} from '../../src/modules/notifications/enums/index.js';
import { RefundsService } from '../../src/modules/refunds/services/refunds.service.js';
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from './helpers/auth.helper.js';

describe('MANVIA M5 Commerce & Notifications Platform (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;
  let availabilityRepo: IDoctorAvailabilityRepository;
  let notifRepo: INotificationRepository;

  let doctorA: E2EUser;
  let doctorB: E2EUser;
  let patientA: E2EUser;
  let patientB: E2EUser;
  let adminUser: E2EUser;

  let doctorAId: string;
  let offerAId: string;
  let appointmentAId: string;
  let patientAProfileId: string;
  let createdPaymentId: string;
  let providerPaymentId: string;
  let refundsService: RefundsService;

  beforeAll(async () => {
    app = await setupE2EApp();

    doctorA = await createE2EUser(app, { role: 'DOCTOR' });
    doctorB = await createE2EUser(app, { role: 'DOCTOR' });
    patientA = await createE2EUser(app, { role: 'PATIENT' });
    patientB = await createE2EUser(app, { role: 'PATIENT' });
    adminUser = await createE2EUser(app, { role: 'ADMIN' });

    doctorsRepo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    availabilityRepo = app.get<IDoctorAvailabilityRepository>(DOCTOR_AVAILABILITY_REPOSITORY);
    notifRepo = app.get<INotificationRepository>(NOTIFICATION_REPOSITORY);
    refundsService = app.get<RefundsService>(RefundsService);

    const specialties = await doctorsRepo.findActiveSpecialties();
    const languages = await doctorsRepo.findAllLanguages();
    const specId = specialties[0]?.id ?? 'default-spec';
    const langId = languages[0]?.id ?? 'default-lang';

    // Doctor A setup
    const suffixA = Math.random().toString(36).substring(2, 8).toUpperCase();
    const docA = await doctorsRepo.createProfile({
      userId: doctorA.id,
      publicDoctorId: `DOC-${suffixA}`,
      displayName: 'Dr. Alice Bennett, MD',
      medicalRegistrationNumber: `MED-COMM-A-${suffixA}`,
      licensingCouncil: 'Medical Board of Diagnostics',
      yearsOfExperience: 14,
      defaultConsultationFee: 150,
      currency: 'USD',
      specialties: [{ specialtyId: specId, isPrimary: true }],
      languages: [{ languageId: langId }],
    });
    await doctorsRepo.updateVerificationStatus(docA.id, VerificationStatus.VERIFIED);
    doctorAId = docA.id;

    // Doctor B setup
    const suffixB = Math.random().toString(36).substring(2, 8).toUpperCase();
    const docB = await doctorsRepo.createProfile({
      userId: doctorB.id,
      publicDoctorId: `DOC-${suffixB}`,
      displayName: 'Dr. Robert Chase, MD',
      medicalRegistrationNumber: `MED-COMM-B-${suffixB}`,
      licensingCouncil: 'Medical Board of Diagnostics',
      yearsOfExperience: 10,
      defaultConsultationFee: 120,
      currency: 'USD',
      specialties: [{ specialtyId: specId, isPrimary: true }],
      languages: [{ languageId: langId }],
    });
    await doctorsRepo.updateVerificationStatus(docB.id, VerificationStatus.VERIFIED);

    // Availability & Offer for Doctor A (Monday-Sunday 08:00 - 20:00 UTC)
    for (const day of Object.values(DayOfWeek)) {
      await availabilityRepo.createAvailability(doctorAId, {
        timezone: 'UTC',
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '20:00',
      });
    }

    const offer = await availabilityRepo.createOffer(doctorAId, {
      title: 'Full Diagnostics Consult',
      consultationType: ConsultationType.INITIAL,
      durationMinutes: 45,
      fee: 150,
      currency: 'USD',
      status: OfferStatus.ACTIVE,
    });
    offerAId = offer.id;

    // Create appointment for Patient A
    const startAt = new Date('2026-12-10T14:00:00.000Z').toISOString();
    const apptRes = await app.inject({
      method: 'POST',
      url: '/api/v1/appointments',
      headers: patientA.headers,
      payload: {
        doctorId: doctorAId,
        consultationOfferId: offerAId,
        startAt,
        notes: 'Pre-commerce consultation',
        preConsultation: {
          reasonForVisit: 'General checkup before consultation',
          symptoms: 'None',
        },
      },
    });
    if (apptRes.statusCode !== 201) {
      console.error('Failed to create appointment:', apptRes.body);
    }
    expect(apptRes.statusCode).toBe(201);
    const apptBody = JSON.parse(apptRes.body);
    appointmentAId = apptBody.id;
    patientAProfileId = apptBody.patientId;
  }, 60000);

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [
        doctorA?.email,
        doctorB?.email,
        patientA?.email,
        patientB?.email,
        adminUser?.email,
      ]);
      await app.close();
    }
  });

  describe('1. Payments Domain & Idempotency', () => {
    const testIdemKey = `idem-m5-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    it('creates a payment session with server-derived pricing and returns checkout details', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/payments',
        headers: patientA.headers,
        payload: {
          appointmentId: appointmentAId,
          provider: 'simulated',
          idempotencyKey: testIdemKey,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.publicPaymentId).toMatch(/^PAY-[A-Z0-9]{16}$/);
      expect(body.appointmentId).toBe(appointmentAId);
      expect(body.patientId).toBe(patientAProfileId);
      expect(body.doctorId).toBe(doctorAId);
      expect(body.amount).toMatch(/^150(\.00)?$/); // Server-derived from consultation offer
      expect(body.currency).toBe('USD');
      expect(body.status).toBe('PENDING');
      expect(body.provider).toBe('simulated');
      expect(body.providerPaymentId).toMatch(/^sim_pay_/);
      expect(body.checkoutUrl).toBeDefined();

      createdPaymentId = body.id;
      providerPaymentId = body.providerPaymentId;
    });

    it('enforces idempotency: duplicate request with same key returns existing payment', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/payments',
        headers: patientA.headers,
        payload: {
          appointmentId: appointmentAId,
          provider: 'simulated',
          idempotencyKey: testIdemKey,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(createdPaymentId);
      expect(body.publicPaymentId).toBeDefined();
    });

    it('denies payment access to unauthorized patient B (Cross-tenant security)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${createdPaymentId}`,
        headers: patientB.headers,
      });

      expect(res.statusCode).toBe(403);
    });

    it('prevents caller-supplied identity headers from overriding trusted request.user', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${createdPaymentId}`,
        headers: {
          ...patientB.headers,
          'x-user-id': patientA.id,
          'x-user-role': 'ADMIN',
          'x-active-role': 'ADMIN',
        },
      });

      // Still forbidden because trusted request.user is patientB
      expect(res.statusCode).toBe(403);
    });

    it('allows doctor A to view payment linked to their consultation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${createdPaymentId}`,
        headers: doctorA.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.id).toBe(createdPaymentId);
    });

    it('denies doctor B access to doctor A consultation payment', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${createdPaymentId}`,
        headers: doctorB.headers,
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('2. Webhook Security & Verification Boundary', () => {
    it('rejects webhook with missing or invalid signature (returns 401)', async () => {
      const payload = JSON.stringify({
        id: 'evt_invalid_sig_001',
        type: 'payment.succeeded',
        data: {
          paymentId: createdPaymentId,
          providerPaymentId,
          amount: '150.00',
          currency: 'USD',
          status: 'SUCCEEDED',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhooks/simulated',
        headers: {
          'content-type': 'application/json',
          'x-manvia-signature': 'invalid_forged_signature_123',
        },
        payload,
      });

      expect(res.statusCode).toBe(401);
    });

    it('processes valid HMAC webhook: transitions payment, issues invoice, registers payout', async () => {
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'simulated-secret-key-12345';
      const webhookEventId = `evt_succ_${Date.now()}`;
      const payloadObj = {
        id: webhookEventId,
        type: 'payment.succeeded',
        data: {
          paymentId: createdPaymentId,
          providerPaymentId,
          amount: '150.00',
          currency: 'USD',
          status: 'SUCCEEDED',
        },
      };
      const rawPayload = JSON.stringify(payloadObj);
      const signature = createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhooks/simulated',
        headers: {
          'content-type': 'application/json',
          'x-manvia-signature': signature,
        },
        payload: rawPayload,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.received).toBe(true);
      expect(body.processed).toBe(true);
      expect(body.duplicate).toBe(false);

      // Verify payment transitioned to SUCCEEDED
      const payRes = await app.inject({
        method: 'GET',
        url: `/api/v1/payments/${createdPaymentId}`,
        headers: patientA.headers,
      });
      const payBody = JSON.parse(payRes.body);
      expect(payBody.status).toBe('SUCCEEDED');
    });

    it('protects against duplicate webhook replay: returns duplicate: true without side effects', async () => {
      const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'simulated-secret-key-12345';
      const duplicateEventId = `evt_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const payloadObj = {
        id: duplicateEventId,
        type: 'payment.succeeded',
        data: {
          paymentId: createdPaymentId,
          providerPaymentId,
          amount: '150.00',
          currency: 'USD',
          status: 'SUCCEEDED',
        },
      };
      const rawPayload = JSON.stringify(payloadObj);
      const signature = createHmac('sha256', webhookSecret).update(rawPayload).digest('hex');

      // First delivery
      const firstRes = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhooks/simulated',
        headers: {
          'content-type': 'application/json',
          'x-manvia-signature': signature,
        },
        payload: rawPayload,
      });
      expect(firstRes.statusCode).toBe(200);
      expect(JSON.parse(firstRes.body).duplicate).toBe(false);

      // Second replay delivery
      const secondRes = await app.inject({
        method: 'POST',
        url: '/api/v1/payments/webhooks/simulated',
        headers: {
          'content-type': 'application/json',
          'x-manvia-signature': signature,
        },
        payload: rawPayload,
      });
      expect(secondRes.statusCode).toBe(200);
      const secondBody = JSON.parse(secondRes.body);
      expect(secondBody.received).toBe(true);
      expect(secondBody.duplicate).toBe(true);
    });
  });

  describe('3. Invoices & Doctor Payouts Scoping', () => {
    it('allows patient A to retrieve their finalized invoice', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/invoices',
        headers: patientA.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeGreaterThan(0);
      const inv = body.items[0];
      expect(inv.invoiceNumber).toMatch(/^INV-\d{6}-[A-Z0-9]{8}$/);
      expect(inv.patientId).toBe(patientAProfileId);
      expect(inv.total).toMatch(/^150(\.00)?$/);
    });

    it('denies patient B access to patient A invoice (Isolation test)', async () => {
      const invListRes = await app.inject({
        method: 'GET',
        url: '/api/v1/invoices',
        headers: patientA.headers,
      });
      const invoiceId = JSON.parse(invListRes.body).items[0].id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/invoices/${invoiceId}`,
        headers: patientB.headers,
      });

      expect(res.statusCode).toBe(403);
    });

    it('allows doctor A to retrieve payouts for their completed consultation', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/payouts',
        headers: doctorA.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items.length).toBeGreaterThan(0);
      const payout = body.items[0];
      expect(payout.doctorId).toBe(doctorAId);
      expect(payout.publicPayoutId).toMatch(/^PO-[A-Z0-9]{16}$/);
    });

    it('prevents doctor B from viewing doctor A payouts', async () => {
      const payoutListRes = await app.inject({
        method: 'GET',
        url: '/api/v1/payouts',
        headers: doctorA.headers,
      });
      const payoutId = JSON.parse(payoutListRes.body).items[0].id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/payouts/${payoutId}`,
        headers: doctorB.headers,
      });

      expect(res.statusCode).toBe(403);
    });

    it('prevents patients from accessing doctor payouts entirely', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/payouts',
        headers: patientA.headers,
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('4. Notification Platform & User Preferences', () => {
    it('creates and retrieves durable in-app notifications for patient A', async () => {
      // Create a test notification directly in PostgreSQL via repository
      await notifRepo.createNotification({
        userId: patientA.id,
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Consultation Confirmed',
        body: 'Dr. Alice Bennett confirmed your appointment.',
        severity: NotificationSeverity.INFO,
        isRead: false,
        readAt: null,
        expiresAt: null,
        metadata: null,
        idempotencyKey: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: patientA.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.length).toBeGreaterThan(0);
      const notif = body.data[0];
      expect(notif.userId).toBe(patientA.id);
      expect(notif.isRead).toBe(false);
      expect(notif.publicNotificationId).toMatch(/^NOT-[A-Z0-9]{8}$/);
    });

    it('marks a notification as read and reflects in unread count', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?unreadOnly=true',
        headers: patientA.headers,
      });
      const notifId = JSON.parse(listRes.body).data[0].id;

      const readRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notifId}/read`,
        headers: patientA.headers,
      });

      expect(readRes.statusCode).toBe(200);
      expect(JSON.parse(readRes.body).isRead).toBe(true);
    });

    it('prevents user B from reading or modifying user A notification', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications',
        headers: patientA.headers,
      });
      const notifId = JSON.parse(listRes.body).data[0].id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/notifications/${notifId}/read`,
        headers: patientB.headers,
      });

      expect(res.statusCode).toBe(403);
    });

    it('retrieves and updates notification preferences while keeping security alerts mandatory', async () => {
      const getRes = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
        headers: patientA.headers,
      });

      expect(getRes.statusCode).toBe(200);
      const initialPrefs = JSON.parse(getRes.body);
      expect(initialPrefs.securityNotifications).toBe(true);

      const updateRes = await app.inject({
        method: 'PATCH',
        url: '/api/v1/notifications/preferences',
        headers: patientA.headers,
        payload: {
          smsEnabled: true,
          marketingNotifications: false,
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const updatedPrefs = JSON.parse(updateRes.body);
      expect(updatedPrefs.smsEnabled).toBe(true);
      expect(updatedPrefs.marketingNotifications).toBe(false);
      // Security alerts must never be disabled
      expect(updatedPrefs.securityNotifications).toBe(true);
    });
  });

  describe('5. Durable Refunds & Idempotency', () => {
    let createdRefundId: string;
    const testRefundIdemKey = `idem-ref-${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    it('creates and processes a refund transaction idempotently via provider abstraction', async () => {
      const refundDto = {
        appointmentId: appointmentAId,
        paymentId: createdPaymentId,
        amount: 50,
        currency: 'USD',
        reason: 'Patient requested partial consultation fee adjustment',
        idempotencyKey: testRefundIdemKey,
      };

      const refund = await refundsService.createRefund(refundDto, patientA.id, 'PATIENT');
      expect(refund.id).toBeDefined();
      expect(refund.publicRefundId).toMatch(/^REF-[A-Z0-9]{8}$/);
      expect(refund.amount).toBe(50);
      expect(refund.status).toBe('SUCCEEDED');
      expect(refund.providerReference).toBeDefined();

      createdRefundId = refund.id;

      // Duplicate request with same idempotency key returns existing refund without second processing
      const duplicateRefund = await refundsService.createRefund(refundDto, patientA.id, 'PATIENT');
      expect(duplicateRefund.id).toBe(createdRefundId);
    });

    it('allows patient A to list and retrieve their refund', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/refunds',
        headers: patientA.headers,
      });

      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.body);
      expect(listBody.data.length).toBeGreaterThan(0);

      const singleRes = await app.inject({
        method: 'GET',
        url: `/api/v1/refunds/${createdRefundId}`,
        headers: patientA.headers,
      });

      expect(singleRes.statusCode).toBe(200);
      const singleBody = JSON.parse(singleRes.body);
      expect(singleBody.id).toBe(createdRefundId);
      expect(singleBody.status).toBe('SUCCEEDED');
    });

    it('prevents patient B from accessing patient A refund (Isolation)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/refunds/${createdRefundId}`,
        headers: patientB.headers,
      });

      expect(res.statusCode).toBe(403);
    });

    it('rejects refund request with negative or zero amount', async () => {
      await expect(
        refundsService.createRefund(
          {
            appointmentId: appointmentAId,
            amount: 0,
            currency: 'USD',
            reason: 'Zero amount refund attempt',
          },
          patientA.id,
          'PATIENT',
        ),
      ).rejects.toThrow();
    });
  });
});
