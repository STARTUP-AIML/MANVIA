import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentsService } from '../../src/modules/payments/services/payments.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { SimulatedPaymentProvider } from '../../src/modules/payments/providers/simulated-payment.provider.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { InvoiceService } from '../../src/modules/payments/services/invoice.service.js';
import { PricingService } from '../../src/modules/payments/services/pricing.service.js';
import { DoctorPayoutService } from '../../src/modules/payments/services/doctor-payout.service.js';
import { PayoutEligibilityService } from '../../src/modules/payments/services/payout-eligibility.service.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import { PaymentAttemptStatus } from '../../src/modules/payments/enums/payment-attempt-status.enum.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import type { IAppointmentRepository } from '../../src/modules/appointments/interfaces/appointment-repository.interface.js';
import type { IDoctorAvailabilityRepository } from '../../src/modules/doctor-availability/interfaces/availability-repository.interface.js';
import type { IEventBus } from '../../src/events/event-bus.interface.js';

describe('Phase 19 — PaymentsService', () => {
  let paymentsService: PaymentsService;
  let paymentRepo: InMemoryPaymentRepository;
  let paymentProvider: SimulatedPaymentProvider;
  let payoutProvider: SimulatedPayoutProvider;
  let auditService: PaymentAuditService;
  let invoiceService: InvoiceService;
  let pricingService: PricingService;
  let payoutService: DoctorPayoutService;
  let appointmentRepo: Partial<IAppointmentRepository>;
  let availabilityRepo: Partial<IDoctorAvailabilityRepository>;
  let eventBus: Partial<IEventBus>;

  const mockPatient = {
    userId: 'pat-100',
    activeRole: 'PATIENT' as const,
  };

  beforeEach(() => {
    paymentRepo = new InMemoryPaymentRepository();
    paymentProvider = new SimulatedPaymentProvider();
    payoutProvider = new SimulatedPayoutProvider();
    auditService = new PaymentAuditService();
    invoiceService = new InvoiceService(paymentRepo, auditService);
    pricingService = new PricingService();
    payoutService = new DoctorPayoutService(
      paymentRepo,
      payoutProvider,
      auditService,
      new PayoutEligibilityService(),
    );

    appointmentRepo = {
      findAppointmentById: vi.fn().mockResolvedValue({
        id: 'appt-1',
        publicAppointmentId: 'APT-1',
        patientId: 'pat-100',
        doctorId: 'doc-200',
        consultationOfferId: 'offer-1',
        status: 'REQUESTED',
      }),
    };

    availabilityRepo = {
      findOfferById: vi.fn().mockResolvedValue({
        id: 'offer-1',
        title: 'General Consultation',
        fee: 150.0,
        currency: 'USD',
      }),
    };

    eventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    paymentsService = new PaymentsService(
      paymentRepo,
      paymentProvider,
      auditService,
      appointmentRepo as IAppointmentRepository,
      invoiceService,
      pricingService,
      payoutService,
      availabilityRepo as IDoctorAvailabilityRepository,
      undefined,
      eventBus as IEventBus,
    );
  });

  describe('createPayment', () => {
    it('should derive amount from consultation offer and initiate provider session', async () => {
      const response = await paymentsService.createPayment(
        { appointmentId: 'appt-1' },
        mockPatient,
      );

      expect(response).toBeDefined();
      expect(response.amount).toBe('150.00'); // Derived from offer.fee
      expect(response.currency).toBe('USD');
      expect(response.status).toBe(PaymentStatus.PENDING);
      expect(response.provider).toBe('simulated');
      expect(response.providerPaymentId).toBeDefined();
      expect(response.checkoutUrl).toContain('checkout.simulated.manvia.internal');
      expect(response.attempts).toHaveLength(1);
      expect(response.attempts?.[0]?.status).toBe(PaymentAttemptStatus.INITIATED);
    });

    it('should be idempotent when idempotencyKey is supplied', async () => {
      const idempotencyKey = 'idem-unique-key-1';

      const firstCall = await paymentsService.createPayment(
        { appointmentId: 'appt-1', idempotencyKey },
        mockPatient,
      );

      const secondCall = await paymentsService.createPayment(
        { appointmentId: 'appt-1', idempotencyKey },
        mockPatient,
      );

      expect(firstCall.id).toBe(secondCall.id);
      expect(firstCall.publicPaymentId).toBe(secondCall.publicPaymentId);
    });

    it('should reject payment creation if patient does not own the appointment', async () => {
      const otherPatient = {
        userId: 'pat-other',
        activeRole: 'PATIENT' as const,
      };

      await expect(
        paymentsService.createPayment({ appointmentId: 'appt-1' }, otherPatient),
      ).rejects.toThrow(/Patients are only authorized to pay for their own appointments/);
    });

    it('should reject payment creation if appointment is already paid in full', async () => {
      const initial = await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);

      // Verify and succeed the payment
      await paymentsService.verifyPayment(
        initial.id,
        { providerPaymentId: initial.providerPaymentId! },
        mockPatient,
      );

      // Attempt to pay again
      await expect(
        paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient),
      ).rejects.toThrow(/Appointment has already been paid in full/);
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment server-side, issue invoice, create payout record and emit event', async () => {
      const created = await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);

      const verified = await paymentsService.verifyPayment(
        created.id,
        { providerPaymentId: created.providerPaymentId! },
        mockPatient,
      );

      expect(verified.status).toBe(PaymentStatus.SUCCEEDED);
      expect(verified.paidAt).toBeDefined();

      // Check invoice was created
      const invoice = await paymentRepo.findInvoiceByPaymentId(created.id);
      expect(invoice).toBeDefined();
      expect(invoice!.status).toBe('PAID');
      expect(invoice!.subtotal).toBe('150.00');
      expect(invoice!.invoiceNumber).toMatch(/^INV-\d{6}-[A-F0-9]{8}$/);

      // Check doctor payout was initialized
      const payout = await paymentRepo.findPayoutByAppointmentId('appt-1');
      expect(payout).toBeDefined();
      expect(payout!.grossAmount).toBe('150.00');
      expect(payout!.netAmount).toBeDefined();

      // Check event published
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PAYMENT_SUCCEEDED',
          aggregateId: created.id,
        }),
      );
    });

    it('should reject verification when signature is invalid', async () => {
      const created = await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);

      await expect(
        paymentsService.verifyPayment(
          created.id,
          {
            providerPaymentId: created.providerPaymentId!,
            signature: 'invalid_sig_value',
          },
          mockPatient,
        ),
      ).rejects.toThrow(/Payment verification failed/);

      const failedPayment = await paymentRepo.findPaymentById(created.id);
      expect(failedPayment!.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('executeRefund integration', () => {
    it('should execute provider refund and append to financial ledger', async () => {
      const created = await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);
      await paymentsService.verifyPayment(
        created.id,
        { providerPaymentId: created.providerPaymentId! },
        mockPatient,
      );

      const refundResult = await paymentsService.executeRefund(
        created.id,
        'ref-123',
        '150.00',
        'Patient requested cancellation',
      );

      expect(refundResult.status).toBe('SUCCEEDED');
      expect(refundResult.providerRefundId).toBeDefined();

      // Check financial ledger
      const txs = await paymentRepo.findTransactionsByPaymentId(created.id);
      expect(txs.some((t) => t.type === 'REFUND' && t.direction === 'DEBIT')).toBe(true);
    });

    it('should throw error when refunding non-existent payment or payment without provider reference', async () => {
      await expect(
        paymentsService.executeRefund('missing-pay', 'ref-1', '10.00', 'reason'),
      ).rejects.toThrow(/Payment 'missing-pay'.*not found/);

      const payWithoutProvider = new PaymentEntity({
        id: 'pay-no-prov',
        publicPaymentId: 'PAY-NOPROV',
        appointmentId: 'appt-no-prov',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        amount: '10.00',
        currency: 'USD',
        status: PaymentStatus.CREATED,
        provider: 'simulated',
        providerPaymentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.savePayment(payWithoutProvider);

      await expect(
        paymentsService.executeRefund(payWithoutProvider.id, 'ref-2', '10.00', 'reason'),
      ).rejects.toThrow(/with active provider reference not found/);
    });
  });

  describe('access control and queries', () => {
    it('should enforce role-based access for getPaymentById and getPaymentAttempts', async () => {
      const created = await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);

      // Patient owns payment
      const byPatient = await paymentsService.getPaymentById(created.id, mockPatient);
      expect(byPatient.id).toBe(created.id);

      const attempts = await paymentsService.getPaymentAttempts(created.id, mockPatient);
      expect(attempts).toHaveLength(1);

      // Other patient forbidden
      const otherPatient = { userId: 'pat-other', activeRole: 'PATIENT' as const };
      await expect(paymentsService.getPaymentById(created.id, otherPatient)).rejects.toThrow(
        /Patients are only authorized to access their own payments/,
      );
      await expect(paymentsService.getPaymentAttempts(created.id, otherPatient)).rejects.toThrow(
        /Patients are only authorized to access their own payment attempts/,
      );

      // Doctor with consultation owns payment
      const docContext = { userId: 'doc-200', activeRole: 'DOCTOR' as const };
      const byDoc = await paymentsService.getPaymentById(created.id, docContext);
      expect(byDoc.id).toBe(created.id);

      const docAttempts = await paymentsService.getPaymentAttempts(created.id, docContext);
      expect(docAttempts).toHaveLength(1);

      // Other doctor forbidden
      const otherDoc = { userId: 'doc-other', activeRole: 'DOCTOR' as const };
      await expect(paymentsService.getPaymentById(created.id, otherDoc)).rejects.toThrow(
        /Doctors are only authorized to access payments for their consultations/,
      );
      await expect(paymentsService.getPaymentAttempts(created.id, otherDoc)).rejects.toThrow(
        /Doctors are only authorized to access payment attempts for their consultations/,
      );

      // Admin allowed
      const adminContext = { userId: 'adm', activeRole: 'ADMIN' as const };
      expect((await paymentsService.getPaymentById(created.id, adminContext)).id).toBe(created.id);
      expect(await paymentsService.getPaymentAttempts(created.id, adminContext)).toHaveLength(1);

      // Not found
      await expect(paymentsService.getPaymentById('missing', adminContext)).rejects.toThrow(
        "Payment 'missing' not found",
      );
      await expect(paymentsService.getPaymentAttempts('missing', adminContext)).rejects.toThrow(
        "Payment 'missing' not found",
      );
    });

    it('should query payments with patient, doctor, and admin scoping', async () => {
      await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);

      const patientList = await paymentsService.getPayments({}, mockPatient);
      expect(patientList.total).toBe(1);

      const docList = await paymentsService.getPayments(
        {},
        { userId: 'doc-200', activeRole: 'DOCTOR' },
      );
      expect(docList.total).toBe(1);

      const adminList = await paymentsService.getPayments(
        {},
        { userId: 'adm', activeRole: 'ADMIN' },
      );
      expect(adminList.total).toBe(1);
    });

    it('should throw NotFoundError if appointment not found, or fall back to default fee if offer not found', async () => {
      vi.mocked(appointmentRepo.findAppointmentById)!.mockResolvedValueOnce(null);
      await expect(
        paymentsService.createPayment({ appointmentId: 'missing-appt' }, mockPatient),
      ).rejects.toThrow("Appointment 'missing-appt' not found");

      vi.mocked(appointmentRepo.findAppointmentById)!.mockResolvedValueOnce({
        id: 'appt-no-offer',
        patientId: 'pat-100',
        doctorId: 'doc-200',
        consultationOfferId: 'missing-offer',
        status: 'REQUESTED',
      } as unknown as Awaited<ReturnType<NonNullable<typeof appointmentRepo.findAppointmentById>>>);
      vi.mocked(availabilityRepo.findOfferById)!.mockResolvedValueOnce(null);

      const fallbackPayment = await paymentsService.createPayment(
        { appointmentId: 'appt-no-offer' },
        mockPatient,
      );
      expect(fallbackPayment.amount).toBe('100.00');
    });

    it('should return already verified payment on duplicate verifyPayment call', async () => {
      const created = await paymentsService.createPayment({ appointmentId: 'appt-1' }, mockPatient);
      await paymentsService.verifyPayment(
        created.id,
        { providerPaymentId: created.providerPaymentId! },
        mockPatient,
      );

      const duplicateVerify = await paymentsService.verifyPayment(
        created.id,
        { providerPaymentId: created.providerPaymentId! },
        mockPatient,
      );

      expect(duplicateVerify.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });
});
