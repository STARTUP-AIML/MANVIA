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
  });
});
