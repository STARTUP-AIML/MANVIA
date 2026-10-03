import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReconciliationService } from '../../src/modules/payments/services/reconciliation.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { SimulatedPaymentProvider } from '../../src/modules/payments/providers/simulated-payment.provider.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { DoctorPayoutEntity } from '../../src/modules/payments/entities/doctor-payout.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import { DoctorPayoutStatus } from '../../src/modules/payments/enums/doctor-payout-status.enum.js';

describe('Phase 19 — ReconciliationService', () => {
  let reconciliationService: ReconciliationService;
  let paymentRepo: InMemoryPaymentRepository;
  let paymentProvider: SimulatedPaymentProvider;
  let payoutProvider: SimulatedPayoutProvider;
  let auditService: PaymentAuditService;

  beforeEach(() => {
    paymentRepo = new InMemoryPaymentRepository();
    paymentProvider = new SimulatedPaymentProvider();
    payoutProvider = new SimulatedPayoutProvider();
    auditService = new PaymentAuditService();

    reconciliationService = new ReconciliationService(
      paymentRepo,
      paymentProvider,
      payoutProvider,
      auditService,
    );
  });

  it('should detect discrepancies when internal state does not match provider state', async () => {
    // 1. Create a session in simulated provider
    const session = await paymentProvider.createPaymentSession({
      paymentId: 'pay-1',
      amount: '100.00',
      currency: 'USD',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
    });

    // 2. In MANVIA internal repo, payment is marked SUCCEEDED, but in provider it is PENDING
    const payment = new PaymentEntity({
      id: 'pay-1',
      publicPaymentId: 'PAY-REC-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      providerPaymentId: session.providerPaymentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    // 3. Run reconciliation
    const result = await reconciliationService.reconcilePayments();

    expect(result.totalChecked).toBe(1);
    expect(result.discrepanciesCount).toBe(1);
    expect(result.discrepancies[0]?.discrepancyType).toBe('STATUS_MISMATCH');
    expect(result.discrepancies[0]?.internalStatus).toBe(PaymentStatus.SUCCEEDED);
    expect(result.discrepancies[0]?.providerStatus).toBe('PENDING');
  });

  it('should report matched when internal state and provider state align', async () => {
    const session = await paymentProvider.createPaymentSession({
      paymentId: 'pay-2',
      amount: '50.00',
      currency: 'USD',
      appointmentId: 'appt-2',
      patientId: 'pat-2',
    });

    const payment = new PaymentEntity({
      id: 'pay-2',
      publicPaymentId: 'PAY-REC-2',
      appointmentId: 'appt-2',
      patientId: 'pat-2',
      doctorId: 'doc-2',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.PENDING,
      provider: 'simulated',
      providerPaymentId: session.providerPaymentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    const result = await reconciliationService.reconcilePayments();
    expect(result.totalChecked).toBe(1);
    expect(result.matched).toBe(1);
    expect(result.discrepanciesCount).toBe(0);
  });

  it('should skip payments without providerPaymentId and handle unverified provider records', async () => {
    // Payment without providerPaymentId
    const paymentNoProv = new PaymentEntity({
      id: 'pay-no-prov',
      publicPaymentId: 'PAY-NO-PROV',
      appointmentId: 'appt-no-prov',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.PENDING,
      provider: 'simulated',
      providerPaymentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(paymentNoProv);

    // Payment that fails provider verification
    const paymentUnverified = new PaymentEntity({
      id: 'pay-unverified',
      publicPaymentId: 'PAY-UNVERIFIED',
      appointmentId: 'appt-unver',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.PENDING,
      provider: 'simulated',
      providerPaymentId: 'sim_pay_missing',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(paymentUnverified);

    vi.spyOn(paymentProvider, 'fetchPayment').mockResolvedValueOnce({
      verified: false,
      providerPaymentId: 'sim_pay_missing',
      status: 'FAILED',
      failureReason: 'Record not found in upstream gateway',
    });

    const result = await reconciliationService.reconcilePayments();
    expect(result.discrepanciesCount).toBe(1);
    expect(result.discrepancies[0]?.discrepancyType).toBe('MISSING_IN_PROVIDER');
  });

  it('should handle provider errors gracefully during payment reconciliation', async () => {
    const payment = new PaymentEntity({
      id: 'pay-err-prov',
      publicPaymentId: 'PAY-ERR-PROV',
      appointmentId: 'appt-err-prov',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.PENDING,
      provider: 'simulated',
      providerPaymentId: 'sim_pay_err',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    vi.spyOn(paymentProvider, 'fetchPayment').mockRejectedValueOnce(new Error('Gateway timeout'));

    const result = await reconciliationService.reconcilePayments();
    expect(result.totalChecked).toBe(1);
    expect(result.discrepanciesCount).toBe(0);
  });

  describe('reconcilePayouts', () => {
    it('should reconcile doctor payouts and report match when statuses align', async () => {
      const payout = new DoctorPayoutEntity({
        id: 'po-rec-1',
        publicPayoutId: 'PO-REC-1',
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
        provider: 'simulated',
        providerPayoutId: 'sim_po_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.savePayout(payout);

      vi.spyOn(payoutProvider, 'fetchPayout').mockResolvedValueOnce({
        providerPayoutId: 'sim_po_123',
        status: 'PAID',
      });

      const result = await reconciliationService.reconcilePayouts();
      expect(result.totalChecked).toBe(1);
      expect(result.matched).toBe(1);
      expect(result.discrepanciesCount).toBe(0);
    });

    it('should detect discrepancies when payout provider status differs', async () => {
      const payout = new DoctorPayoutEntity({
        id: 'po-rec-2',
        publicPayoutId: 'PO-REC-2',
        doctorId: 'doc-2',
        appointmentId: 'appt-2',
        paymentId: 'pay-2',
        grossAmount: '100.00',
        platformFee: '15.00',
        taxWithheld: '0.00',
        providerFee: '2.50',
        netAmount: '82.50',
        currency: 'USD',
        status: DoctorPayoutStatus.PROCESSING,
        provider: 'simulated',
        providerPayoutId: 'sim_po_456',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.savePayout(payout);

      vi.spyOn(payoutProvider, 'fetchPayout').mockResolvedValueOnce({
        providerPayoutId: 'sim_po_456',
        status: 'FAILED',
        failureReason: 'Account invalid',
      });

      const result = await reconciliationService.reconcilePayouts();
      expect(result.totalChecked).toBe(1);
      expect(result.discrepanciesCount).toBe(1);
      expect(result.discrepancies[0]?.discrepancyType).toBe('STATUS_MISMATCH');
      expect(result.discrepancies[0]?.entityType).toBe('PAYOUT');
    });

    it('should skip payouts without providerPayoutId and handle provider exceptions', async () => {
      const payoutNoProv = new DoctorPayoutEntity({
        id: 'po-no-prov',
        publicPayoutId: 'PO-NO-PROV',
        doctorId: 'doc-3',
        appointmentId: 'appt-3',
        paymentId: 'pay-3',
        grossAmount: '100.00',
        platformFee: '15.00',
        taxWithheld: '0.00',
        providerFee: '2.50',
        netAmount: '82.50',
        currency: 'USD',
        status: DoctorPayoutStatus.PENDING,
        providerPayoutId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.savePayout(payoutNoProv);

      const payoutErr = new DoctorPayoutEntity({
        id: 'po-err',
        publicPayoutId: 'PO-ERR',
        doctorId: 'doc-4',
        appointmentId: 'appt-4',
        paymentId: 'pay-4',
        grossAmount: '100.00',
        platformFee: '15.00',
        taxWithheld: '0.00',
        providerFee: '2.50',
        netAmount: '82.50',
        currency: 'USD',
        status: DoctorPayoutStatus.PROCESSING,
        providerPayoutId: 'sim_po_err',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await paymentRepo.savePayout(payoutErr);

      vi.spyOn(payoutProvider, 'fetchPayout').mockRejectedValueOnce(
        new Error('Network error on payout API'),
      );

      const result = await reconciliationService.reconcilePayouts();
      expect(result.totalChecked).toBe(2);
      expect(result.discrepanciesCount).toBe(0);
    });
  });
});
