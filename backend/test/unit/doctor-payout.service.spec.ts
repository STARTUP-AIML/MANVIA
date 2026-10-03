import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DoctorPayoutService } from '../../src/modules/payments/services/doctor-payout.service.js';
import { PayoutEligibilityService } from '../../src/modules/payments/services/payout-eligibility.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import { DoctorPayoutStatus } from '../../src/modules/payments/enums/doctor-payout-status.enum.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';

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

    // Idempotent retry returns already paid payout
    const reProcessed = await payoutService.processPayout(payout.id, adminContext);
    expect(reProcessed.status).toBe(DoctorPayoutStatus.PAID);
  });

  it('should throw NotFoundError and ConflictError in processPayout', async () => {
    const adminContext = { userId: 'adm-1', activeRole: 'ADMIN' as const };

    await expect(payoutService.processPayout('non-existent', adminContext)).rejects.toThrow(
      'Payout non-existent not found',
    );

    const payment = new PaymentEntity({
      id: 'pay-conflict',
      publicPaymentId: 'PAY-CONF',
      appointmentId: 'appt-conflict',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const po = await payoutService.createPendingPayout({
      payment,
      breakdown: {
        baseAmount: '50.00',
        discount: '0.00',
        taxableAmount: '50.00',
        tax: '0.00',
        platformFee: '5.00',
        providerFee: '1.00',
        doctorShare: '44.00',
        total: '50.00',
        currency: 'USD',
      },
    });

    po.markCancelled('Disputed cancellation');
    await paymentRepo.savePayout(po);

    await expect(payoutService.processPayout(po.id, adminContext)).rejects.toThrow(
      /Cannot process payout in status CANCELLED/,
    );
  });

  it('should handle provider failure and exception during processPayout', async () => {
    const adminContext = { userId: 'adm-1', activeRole: 'ADMIN' as const };

    const payment = new PaymentEntity({
      id: 'pay-fail',
      publicPaymentId: 'PAY-FAIL',
      appointmentId: 'appt-fail',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const po = await payoutService.createPendingPayout({
      payment,
      breakdown: {
        baseAmount: '50.00',
        discount: '0.00',
        taxableAmount: '50.00',
        tax: '0.00',
        platformFee: '5.00',
        providerFee: '1.00',
        doctorShare: '44.00',
        total: '50.00',
        currency: 'USD',
      },
    });

    // Provider returns FAILED
    vi.spyOn(payoutProvider, 'createPayout').mockResolvedValueOnce({
      providerPayoutId: 'po_fail',
      status: 'FAILED',
      failureReason: 'Bank account frozen',
    });

    const failedPayout = await payoutService.processPayout(po.id, adminContext);
    expect(failedPayout.status).toBe(DoctorPayoutStatus.FAILED);
    expect(failedPayout.failureReason).toBe('Bank account frozen');

    // Create a second pending payout for exception test
    const payment2 = new PaymentEntity({
      id: 'pay-crash',
      publicPaymentId: 'PAY-CRASH',
      appointmentId: 'appt-crash',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '50.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const po2 = await payoutService.createPendingPayout({
      payment: payment2,
      breakdown: {
        baseAmount: '50.00',
        discount: '0.00',
        taxableAmount: '50.00',
        tax: '0.00',
        platformFee: '5.00',
        providerFee: '1.00',
        doctorShare: '44.00',
        total: '50.00',
        currency: 'USD',
      },
    });

    vi.spyOn(payoutProvider, 'createPayout').mockRejectedValueOnce(new Error('Network crash'));

    await expect(payoutService.processPayout(po2.id, adminContext)).rejects.toThrow(
      'Network crash',
    );
    const crashedPayout = await paymentRepo.findPayoutById(po2.id);
    expect(crashedPayout?.status).toBe(DoctorPayoutStatus.FAILED);
  });

  it('should enforce role-based access in getPayoutById and getPayouts', async () => {
    const mockDoctorsRepo = {
      findByUserId: vi.fn().mockImplementation(async (userId: string) => {
        if (userId === 'user-doc-1') {
          return { id: 'doc-profile-1', publicDoctorId: 'DOC-123' };
        }
        return null;
      }),
    };

    const serviceWithDoctors = new DoctorPayoutService(
      paymentRepo,
      payoutProvider,
      auditService,
      eligibilityService,
      mockDoctorsRepo as unknown as IDoctorsRepository,
    );

    const payment = new PaymentEntity({
      id: 'pay-auth',
      publicPaymentId: 'PAY-AUTH',
      appointmentId: 'appt-auth',
      patientId: 'pat-1',
      doctorId: 'doc-profile-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const po = await serviceWithDoctors.createPendingPayout({
      payment,
      breakdown: {
        baseAmount: '100.00',
        discount: '0.00',
        taxableAmount: '100.00',
        tax: '0.00',
        platformFee: '10.00',
        providerFee: '2.00',
        doctorShare: '88.00',
        total: '100.00',
        currency: 'USD',
      },
    });

    // 1. Patient gets ForbiddenError
    await expect(
      serviceWithDoctors.getPayoutById(po.id, { userId: 'pat-1', activeRole: 'PATIENT' }),
    ).rejects.toThrow('Patients are not authorized to view doctor payouts');

    await expect(
      serviceWithDoctors.getPayouts({}, { userId: 'pat-1', activeRole: 'PATIENT' }),
    ).rejects.toThrow('Patients are not authorized to view doctor payouts');

    // 2. Unauthorized Doctor gets ForbiddenError
    await expect(
      serviceWithDoctors.getPayoutById(po.id, { userId: 'user-doc-other', activeRole: 'DOCTOR' }),
    ).rejects.toThrow('Doctors can only view their own payouts');

    // 3. Authorized Doctor gets payout by resolving userId -> doctor profile
    const byDoc = await serviceWithDoctors.getPayoutById(po.id, {
      userId: 'user-doc-1',
      activeRole: 'DOCTOR',
    });
    expect(byDoc.id).toBe(po.id);

    const docList = await serviceWithDoctors.getPayouts(
      {},
      { userId: 'user-doc-1', activeRole: 'DOCTOR' },
    );
    expect(docList.total).toBe(1);

    // 4. Admin gets payout
    const byAdmin = await serviceWithDoctors.getPayoutById(po.id, {
      userId: 'adm-1',
      activeRole: 'ADMIN',
    });
    expect(byAdmin.id).toBe(po.id);

    // 5. Not found check
    await expect(
      serviceWithDoctors.getPayoutById('missing-payout', { userId: 'adm-1', activeRole: 'ADMIN' }),
    ).rejects.toThrow('Payout missing-payout not found');

    // 6. checkAndMarkEligible with missing payout returns null
    const noPayoutEligible = await serviceWithDoctors.checkAndMarkEligible(
      'missing-appt',
      'COMPLETED',
    );
    expect(noPayoutEligible).toBeNull();
  });
});
