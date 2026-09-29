import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentWebhookService } from '../../src/modules/payments/services/payment-webhook.service.js';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { SimulatedPaymentProvider } from '../../src/modules/payments/providers/simulated-payment.provider.js';
import { SimulatedPayoutProvider } from '../../src/modules/payments/providers/simulated-payout.provider.js';
import { PaymentAuditService } from '../../src/modules/payments/services/payment-audit.service.js';
import { InvoiceService } from '../../src/modules/payments/services/invoice.service.js';
import { PricingService } from '../../src/modules/payments/services/pricing.service.js';
import { DoctorPayoutService } from '../../src/modules/payments/services/doctor-payout.service.js';
import { PayoutEligibilityService } from '../../src/modules/payments/services/payout-eligibility.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import type { IEventBus } from '../../src/events/event-bus.interface.js';

describe('Phase 19 — PaymentWebhookService', () => {
  let webhookService: PaymentWebhookService;
  let paymentRepo: InMemoryPaymentRepository;
  let paymentProvider: SimulatedPaymentProvider;
  let auditService: PaymentAuditService;
  let invoiceService: InvoiceService;
  let pricingService: PricingService;
  let payoutService: DoctorPayoutService;
  let eventBus: Partial<IEventBus>;

  beforeEach(() => {
    paymentRepo = new InMemoryPaymentRepository();
    paymentProvider = new SimulatedPaymentProvider();
    auditService = new PaymentAuditService();
    invoiceService = new InvoiceService(paymentRepo, auditService);
    pricingService = new PricingService();
    payoutService = new DoctorPayoutService(
      paymentRepo,
      new SimulatedPayoutProvider(),
      auditService,
      new PayoutEligibilityService(),
    );
    eventBus = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    webhookService = new PaymentWebhookService(
      paymentRepo,
      paymentProvider,
      auditService,
      invoiceService,
      pricingService,
      payoutService,
      eventBus as IEventBus,
    );
  });

  it('should verify signature and process payment.succeeded event', async () => {
    // 1. Create a payment in repo
    const payment = new PaymentEntity({
      id: 'pay-uuid-webhook',
      publicPaymentId: 'PAY-WH1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '120.00',
      currency: 'USD',
      status: PaymentStatus.PENDING,
      provider: 'simulated',
      providerPaymentId: 'sim_pay_webhook_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    // 2. Generate signed webhook event
    const eventPayload = {
      id: 'evt_1001',
      type: 'payment.succeeded',
      providerPaymentId: 'sim_pay_webhook_1',
      amount: '120.00',
      currency: 'USD',
      status: 'SUCCEEDED',
    };
    const { payload, signature } = paymentProvider.generateSignedWebhookPayload(eventPayload);

    // 3. Process webhook
    const result = await webhookService.handleWebhook(
      'simulated',
      { 'x-manvia-signature': signature },
      payload,
    );

    expect(result.processed).toBe(true);
    expect(result.duplicate).toBe(false);

    // Verify payment updated to SUCCEEDED
    const updatedPayment = await paymentRepo.findPaymentById('pay-uuid-webhook');
    expect(updatedPayment!.status).toBe(PaymentStatus.SUCCEEDED);

    // Verify invoice generated
    const invoice = await paymentRepo.findInvoiceByPaymentId('pay-uuid-webhook');
    expect(invoice).toBeDefined();
    expect(invoice!.status).toBe('PAID');

    // Verify domain event emitted
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'PAYMENT_SUCCEEDED',
        aggregateId: 'pay-uuid-webhook',
      }),
    );
  });

  it('should reject webhook with invalid signature', async () => {
    const payload = JSON.stringify({ id: 'evt_bad', type: 'payment.succeeded' });

    await expect(
      webhookService.handleWebhook(
        'simulated',
        { 'x-manvia-signature': 'invalid_signature_hex' },
        payload,
      ),
    ).rejects.toThrow(/Webhook signature verification failed/);
  });

  it('should skip duplicate webhooks idempotently without reprocessing', async () => {
    const payment = new PaymentEntity({
      id: 'pay-uuid-idem',
      publicPaymentId: 'PAY-IDEM',
      appointmentId: 'appt-idem',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.PENDING,
      provider: 'simulated',
      providerPaymentId: 'sim_pay_idem_1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    const eventPayload = {
      id: 'evt_duplicate_test',
      type: 'payment.succeeded',
      providerPaymentId: 'sim_pay_idem_1',
      status: 'SUCCEEDED',
    };
    const { payload, signature } = paymentProvider.generateSignedWebhookPayload(eventPayload);

    // First call
    const firstResult = await webhookService.handleWebhook(
      'simulated',
      { 'x-manvia-signature': signature },
      payload,
    );
    expect(firstResult.duplicate).toBe(false);
    expect(firstResult.processed).toBe(true);

    // Duplicate call
    const secondResult = await webhookService.handleWebhook(
      'simulated',
      { 'x-manvia-signature': signature },
      payload,
    );
    expect(secondResult.duplicate).toBe(true);
    expect(secondResult.processed).toBe(true);
  });

  it('should protect against stale out-of-order failure webhooks corrupting SUCCEEDED state', async () => {
    const payment = new PaymentEntity({
      id: 'pay-uuid-stale',
      publicPaymentId: 'PAY-STALE',
      appointmentId: 'appt-stale',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED, // Already succeeded
      provider: 'simulated',
      providerPaymentId: 'sim_pay_stale_1',
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await paymentRepo.savePayment(payment);

    const staleFailureEvent = {
      id: 'evt_stale_failure',
      type: 'payment.failed',
      providerPaymentId: 'sim_pay_stale_1',
      status: 'FAILED',
    };
    const { payload, signature } = paymentProvider.generateSignedWebhookPayload(staleFailureEvent);

    await webhookService.handleWebhook('simulated', { 'x-manvia-signature': signature }, payload);

    // State MUST remain SUCCEEDED
    const current = await paymentRepo.findPaymentById('pay-uuid-stale');
    expect(current!.status).toBe(PaymentStatus.SUCCEEDED);
  });
});
