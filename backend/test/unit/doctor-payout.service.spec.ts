import { describe, it, expect, beforeEach } from 'vitest';
import { DoctorPayoutService } from '../../src/modules/payments/services/doctor-payout.service.js';
import { PayoutEligibilityService } from '../../src/modules/payments/services/payout-eligibility.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import { DoctorPayoutStatus } from '../../src/modules/payments/enums/doctor-payout-status.enum.js';

describe('Phase 19 — DoctorPayoutService', () => {
  let payoutService: DoctorPayoutService;
  let eligibilityService: PayoutEligibilityService;
  let paymentRepo: InMemoryPaymentRepository;
  let payoutProvider: SimulatedPayoutProvider;
  let auditService: PaymentAuditService;

  beforeEach(() => {
    paymentRepo = new InMemoryPaymentRepository();
    payoutProvider = new SimulatedPayoutProvider();
    auditService = new PaymentAuditService();
    eligibilityService = new PayoutEligibilityService();

    payoutService = new DoctorPayoutService(
      paymentRepo,
      payoutProvider,
      auditService,
      eligibilityService,
    );
  });

  it('should initialize pending payout with correct net amount breakdown', async () => {
    const payment = new PaymentEntity({
      id: 'pay-1',
      publicPaymentId: 'PAY-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const payout = await payoutService.createPendingPayout({
      payment,
      breakdown: {
        baseAmount: '100.00',
        discount: '0.00',
        taxableAmount: '100.00',
        tax: '0.00',
        platformFee: '15.00',
        providerFee: '2.50',
        doctorShare: '82.50',
        total: '100.00',
        currency: 'USD',
      },
    });

    expect(payout.status).toBe(DoctorPayoutStatus.PENDING);
    expect(payout.grossAmount).toBe('100.00');
    expect(payout.platformFee).toBe('15.00');
    expect(payout.netAmount).toBe('82.50');
    expect(payout.doctorId).toBe('doc-1');
  });

  it('should transition payout to ELIGIBLE only when appointment is completed', async () => {
    const payment = new PaymentEntity({
      id: 'pay-2',
      publicPaymentId: 'PAY-2',
      appointmentId: 'appt-2',
      patientId: 'pat-2',
      doctorId: 'doc-2',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    await payoutService.createPendingPayout({
      payment,
      breakdown: {
        baseAmount: '100.00',
        discount: '0.00',
        taxableAmount: '100.00',
        tax: '0.00',
        platformFee: '15.00',
        providerFee: '2.50',
        doctorShare: '82.50',
        total: '100.00',
        currency: 'USD',
      },
    });

    // 1. If appointment status is CONFIRMED, payout should remain PENDING
    const resultPending = await payoutService.checkAndMarkEligible('appt-2', 'CONFIRMED');
    expect(resultPending!.status).toBe(DoctorPayoutStatus.PENDING);

    // 2. If appointment is COMPLETED, payout transitions to ELIGIBLE
    const resultEligible = await payoutService.checkAndMarkEligible('appt-2', 'COMPLETED');
    expect(resultEligible!.status).toBe(DoctorPayoutStatus.ELIGIBLE);
  });

  it('should process payout when triggered by administrator and record in ledger', async () => {
    const payment = new PaymentEntity({
      id: 'pay-3',
      publicPaymentId: 'PAY-3',
      appointmentId: 'appt-3',
      patientId: 'pat-3',
      doctorId: 'doc-3',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    const payout = await payoutService.createPendingPayout({
      payment,
      breakdown: {
        baseAmount: '100.00',
        discount: '0.00',
        taxableAmount: '100.00',
        tax: '0.00',
        platformFee: '15.00',
        providerFee: '2.50',
        doctorShare: '82.50',
        total: '100.00',
        currency: 'USD',
      },
    });

    await payoutService.checkAndMarkEligible('appt-3', 'COMPLETED');

    // Doctor cannot trigger processPayout
    const doctorContext = { userId: 'doc-3', activeRole: 'DOCTOR' as const };
    await expect(payoutService.processPayout(payout.id, doctorContext)).rejects.toThrow(
      /Only administrative staff can trigger doctor payouts/,
    );

    // Admin executes processPayout
    const adminContext = { userId: 'adm-1', activeRole: 'ADMIN' as const };
    const processed = await payoutService.processPayout(payout.id, adminContext);

    expect(processed.status).toBe(DoctorPayoutStatus.PAID);
    expect(processed.providerPayoutId).toBeDefined();

    // Verify ledger entry
    const ledger = await paymentRepo.findTransactionsByPayoutId(payout.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]?.direction).toBe('DEBIT');
    expect(ledger[0]?.amount).toBe('82.50');
  });
});
