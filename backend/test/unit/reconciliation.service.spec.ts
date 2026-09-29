import { describe, it, expect, beforeEach } from 'vitest';
import { ReconciliationService } from '../../src/modules/payments/services/reconciliation.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { SimulatedPaymentProvider } from '../../src/modules/payments/providers/simulated-payment.provider.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';

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
});
