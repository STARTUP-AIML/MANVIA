import { describe, it, expect } from 'vitest';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentAttemptEntity } from '../../src/modules/payments/entities/payment-attempt.entity.js';
import { InvoiceEntity } from '../../src/modules/payments/entities/invoice.entity.js';
import { DoctorPayoutEntity } from '../../src/modules/payments/entities/doctor-payout.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import { PaymentAttemptStatus } from '../../src/modules/payments/enums/payment-attempt-status.enum.js';
import { InvoiceStatus } from '../../src/modules/payments/enums/invoice-status.enum.js';
import { DoctorPayoutStatus } from '../../src/modules/payments/enums/doctor-payout-status.enum.js';

describe('Phase 19 — Financial State Machines', () => {
  describe('PaymentEntity State Machine', () => {
    const createBasePayment = () =>
      new PaymentEntity({
        id: 'pay-uuid-1',
        publicPaymentId: 'PAY-11223344',
        appointmentId: 'appt-uuid-1',
        patientId: 'patient-uuid-1',
        doctorId: 'doctor-uuid-1',
        amount: '150.00',
        currency: 'USD',
        status: PaymentStatus.CREATED,
        provider: 'simulated',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    it('should transition from CREATED to PENDING to PROCESSING to SUCCEEDED', () => {
      const payment = createBasePayment();
      expect(payment.status).toBe(PaymentStatus.CREATED);

      payment.markPending('prov_123');
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.providerPaymentId).toBe('prov_123');

      payment.markProcessing();
      expect(payment.status).toBe(PaymentStatus.PROCESSING);

      payment.markSucceeded('prov_123');
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
      expect(payment.paidAt).toBeInstanceOf(Date);
    });

    it('should prevent terminal SUCCEEDED payment from regressing to FAILED or CANCELLED', () => {
      const payment = createBasePayment();
      payment.markPending('prov_123');
      payment.markSucceeded('prov_123');
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);

      expect(() => payment.markFailed('Late webhook error')).toThrow(
        /Invalid payment state transition/,
      );
      expect(() => payment.markCancelled('User cancelled')).toThrow(
        /Invalid payment state transition/,
      );
      expect(() => payment.markExpired()).toThrow(/Invalid payment state transition/);
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
    });

    it('should allow retry from FAILED state to PROCESSING', () => {
      const payment = createBasePayment();
      payment.markPending('prov_123');
      payment.markProcessing();
      payment.markFailed('Card declined');
      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.failureReason).toBe('Card declined');

      payment.markProcessing('prov_456');
      expect(payment.status).toBe(PaymentStatus.PROCESSING);
      expect(payment.providerPaymentId).toBe('prov_456');

      payment.markSucceeded('prov_456');
      expect(payment.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });

  describe('PaymentAttemptEntity State Machine', () => {
    it('should transition INITIATED -> PROCESSING -> SUCCEEDED', () => {
      const attempt = new PaymentAttemptEntity({
        id: 'att-1',
        publicAttemptId: 'ATT-1',
        paymentId: 'pay-1',
        attemptNumber: 1,
        provider: 'simulated',
        amount: '100.00',
        currency: 'USD',
        status: PaymentAttemptStatus.INITIATED,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(attempt.status).toBe(PaymentAttemptStatus.INITIATED);
      attempt.markProcessing('prov_att_1');
      expect(attempt.status).toBe(PaymentAttemptStatus.PROCESSING);
      expect(attempt.providerAttemptId).toBe('prov_att_1');

      attempt.markSucceeded('prov_att_1');
      expect(attempt.status).toBe(PaymentAttemptStatus.SUCCEEDED);
      expect(attempt.completedAt).toBeInstanceOf(Date);
    });

    it('should not allow failing a succeeded attempt', () => {
      const attempt = new PaymentAttemptEntity({
        id: 'att-1',
        publicAttemptId: 'ATT-1',
        paymentId: 'pay-1',
        attemptNumber: 1,
        provider: 'simulated',
        amount: '100.00',
        currency: 'USD',
        status: PaymentAttemptStatus.SUCCEEDED,
        startedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => attempt.markFailed('error', 'Late error')).toThrow(
        /Cannot fail an attempt that has already succeeded/,
      );
    });
  });

  describe('InvoiceEntity Immutability', () => {
    it('should prevent cancelling a paid and finalized invoice', () => {
      const invoice = new InvoiceEntity({
        id: 'inv-1',
        publicInvoiceId: 'INV-1',
        invoiceNumber: 'INV-202609-001',
        paymentId: 'pay-1',
        appointmentId: 'appt-1',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        subtotal: '100.00',
        taxes: '0.00',
        discount: '0.00',
        platformFee: '15.00',
        total: '100.00',
        currency: 'USD',
        status: InvoiceStatus.PAID,
        issuedAt: new Date(),
        paidAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => invoice.markCancelled()).toThrow(/Cannot cancel a finalized and paid invoice/);
    });
  });

  describe('DoctorPayoutEntity Lifecycle', () => {
    it('should enforce PENDING -> ELIGIBLE -> PROCESSING -> PAID lifecycle', () => {
      const payout = new DoctorPayoutEntity({
        id: 'po-1',
        publicPayoutId: 'PO-1',
        doctorId: 'doc-1',
        appointmentId: 'appt-1',
        paymentId: 'pay-1',
        grossAmount: '100.00',
        platformFee: '15.00',
        taxWithheld: '0.00',
        providerFee: '2.50',
        netAmount: '82.50',
        currency: 'USD',
        status: DoctorPayoutStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(payout.status).toBe(DoctorPayoutStatus.PENDING);

      payout.markEligible();
      expect(payout.status).toBe(DoctorPayoutStatus.ELIGIBLE);
      expect(payout.eligibleAt).toBeInstanceOf(Date);

      payout.markProcessing('simulated', 'sim_po_1');
      expect(payout.status).toBe(DoctorPayoutStatus.PROCESSING);

      payout.markPaid('sim_po_1');
      expect(payout.status).toBe(DoctorPayoutStatus.PAID);
      expect(payout.processedAt).toBeInstanceOf(Date);
    });

    it('should not allow cancelling an already PAID payout', () => {
      const payout = new DoctorPayoutEntity({
        id: 'po-1',
        publicPayoutId: 'PO-1',
        doctorId: 'doc-1',
        appointmentId: 'appt-1',
        paymentId: 'pay-1',
        grossAmount: '100.00',
        platformFee: '15.00',
        taxWithheld: '0.00',
        providerFee: '2.50',
        netAmount: '82.50',
        currency: 'USD',
        status: DoctorPayoutStatus.PAID,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(() => payout.markCancelled()).toThrow(
        /Cannot cancel a payout that has already been paid/,
      );
    });
  });
});
