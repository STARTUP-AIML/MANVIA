import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryPaymentRepository } from '../../src/modules/payments/repositories/in-memory-payment.repository.js';
import { PrismaPaymentRepository } from '../../src/modules/payments/repositories/prisma-payment.repository.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';
import { PaymentAttemptStatus } from '../../src/modules/payments/enums/payment-attempt-status.enum.js';
import { InvoiceStatus } from '../../src/modules/payments/enums/invoice-status.enum.js';
import { DoctorPayoutStatus } from '../../src/modules/payments/enums/doctor-payout-status.enum.js';
import { FinancialTransactionType } from '../../src/modules/payments/enums/financial-transaction-type.enum.js';
import { TransactionDirection } from '../../src/modules/payments/enums/transaction-direction.enum.js';
import { WebhookProcessingStatus } from '../../src/modules/payments/enums/webhook-processing-status.enum.js';
import {
  PaymentEntity,
  type PaymentProps,
} from '../../src/modules/payments/entities/payment.entity.js';
import {
  PaymentAttemptEntity,
  type PaymentAttemptProps,
} from '../../src/modules/payments/entities/payment-attempt.entity.js';
import {
  InvoiceEntity,
  type InvoiceProps,
} from '../../src/modules/payments/entities/invoice.entity.js';
import {
  DoctorPayoutEntity,
  type DoctorPayoutProps,
} from '../../src/modules/payments/entities/doctor-payout.entity.js';
import {
  FinancialTransactionEntity,
  type FinancialTransactionProps,
} from '../../src/modules/payments/entities/financial-transaction.entity.js';
import {
  PaymentWebhookEventEntity,
  type PaymentWebhookEventProps,
} from '../../src/modules/payments/entities/payment-webhook-event.entity.js';

describe('Payment Repositories (Unit Tests)', () => {
  const createMockPayment = (overrides?: Partial<PaymentProps>): PaymentEntity => {
    return new PaymentEntity({
      id: 'pay-uuid-1',
      publicPaymentId: 'PAY-123456',
      appointmentId: 'appt-uuid-1',
      patientId: 'pat-uuid-1',
      doctorId: 'doc-uuid-1',
      consultationOfferId: 'off-uuid-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.CREATED,
      provider: 'simulated',
      providerPaymentId: 'sim_pay_1',
      idempotencyKey: 'idem-pay-1',
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
      ...overrides,
    });
  };

  const createMockAttempt = (overrides?: Partial<PaymentAttemptProps>): PaymentAttemptEntity => {
    return new PaymentAttemptEntity({
      id: 'att-uuid-1',
      publicAttemptId: 'ATT-123456',
      paymentId: 'pay-uuid-1',
      attemptNumber: 1,
      provider: 'simulated',
      providerAttemptId: 'sim_att_1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentAttemptStatus.INITIATED,
      startedAt: new Date('2026-09-30'),
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
      ...overrides,
    });
  };

  const createMockInvoice = (overrides?: Partial<InvoiceProps>): InvoiceEntity => {
    return new InvoiceEntity({
      id: 'inv-uuid-1',
      publicInvoiceId: 'INV-123456',
      invoiceNumber: 'INV-202609-1234',
      paymentId: 'pay-uuid-1',
      appointmentId: 'appt-uuid-1',
      patientId: 'pat-uuid-1',
      doctorId: 'doc-uuid-1',
      subtotal: '100.00',
      taxes: '0.00',
      discount: '0.00',
      platformFee: '15.00',
      total: '100.00',
      currency: 'USD',
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date('2026-09-30'),
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
      ...overrides,
    });
  };

  const createMockPayout = (overrides?: Partial<DoctorPayoutProps>): DoctorPayoutEntity => {
    return new DoctorPayoutEntity({
      id: 'po-uuid-1',
      publicPayoutId: 'PO-123456',
      doctorId: 'doc-uuid-1',
      appointmentId: 'appt-uuid-1',
      paymentId: 'pay-uuid-1',
      grossAmount: '100.00',
      platformFee: '15.00',
      taxWithheld: '0.00',
      providerFee: '0.00',
      netAmount: '85.00',
      currency: 'USD',
      status: DoctorPayoutStatus.PENDING,
      idempotencyKey: 'idem-po-1',
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
      ...overrides,
    });
  };

  const createMockTx = (
    overrides?: Partial<FinancialTransactionProps>,
  ): FinancialTransactionEntity => {
    return new FinancialTransactionEntity({
      id: 'tx-uuid-1',
      publicTransactionId: 'TX-123456',
      type: FinancialTransactionType.PAYMENT,
      direction: TransactionDirection.CREDIT,
      amount: '100.00',
      currency: 'USD',
      paymentId: 'pay-uuid-1',
      payoutId: 'po-uuid-1',
      status: 'POSTED',
      occurredAt: new Date('2026-09-30'),
      createdAt: new Date('2026-09-30'),
      ...overrides,
    });
  };

  const createMockWebhook = (
    overrides?: Partial<PaymentWebhookEventProps>,
  ): PaymentWebhookEventEntity => {
    return new PaymentWebhookEventEntity({
      id: 'wh-uuid-1',
      provider: 'simulated',
      providerEventId: 'evt_123',
      eventType: 'payment.succeeded',
      payloadHash: 'hash-abc',
      payload: '{}',
      processingStatus: WebhookProcessingStatus.RECEIVED,
      receivedAt: new Date('2026-09-30'),
      createdAt: new Date('2026-09-30'),
      ...overrides,
    });
  };

  describe('InMemoryPaymentRepository', () => {
    let repo: InMemoryPaymentRepository;

    beforeEach(() => {
      repo = new InMemoryPaymentRepository();
    });

    it('should save, find, and query payments', async () => {
      const p = createMockPayment();
      await repo.savePayment(p);

      expect(await repo.findPaymentById('pay-uuid-1')).toEqual(p);
      expect(await repo.findPaymentByPublicId('PAY-123456')).toEqual(p);
      expect(await repo.findPaymentByIdempotencyKey('idem-pay-1')).toEqual(p);
      expect(await repo.findPaymentByProviderPaymentId('sim_pay_1')).toEqual(p);
      expect(await repo.findPaymentByAppointmentId('appt-uuid-1')).toEqual(p);

      expect(await repo.findPaymentById('missing')).toBeNull();
      expect(await repo.findPaymentByPublicId('missing')).toBeNull();
      expect(await repo.findPaymentByIdempotencyKey('missing')).toBeNull();
      expect(await repo.findPaymentByProviderPaymentId('missing')).toBeNull();
      expect(await repo.findPaymentByAppointmentId('missing')).toBeNull();

      const queryResult = await repo.findPayments({
        patientId: 'pat-uuid-1',
        doctorId: 'doc-uuid-1',
        appointmentId: 'appt-uuid-1',
        status: PaymentStatus.CREATED,
        offset: 0,
        limit: 10,
      });

      expect(queryResult.total).toBe(1);
      expect(queryResult.items).toHaveLength(1);
    });

    it('should save and find payment attempts', async () => {
      const att = createMockAttempt();
      await repo.saveAttempt(att);

      const attempts = await repo.findAttemptsByPaymentId('pay-uuid-1');
      expect(attempts).toHaveLength(1);
      expect(attempts[0]?.publicAttemptId).toBe('ATT-123456');
    });

    it('should save, find, and update webhook events', async () => {
      const wh = createMockWebhook();
      await repo.saveWebhookEvent(wh);

      const found = await repo.findWebhookEvent('simulated', 'evt_123');
      expect(found).not.toBeNull();
      expect(found?.eventType).toBe('payment.succeeded');

      const notFound = await repo.findWebhookEvent('simulated', 'unknown_evt');
      expect(notFound).toBeNull();

      const updated = new PaymentWebhookEventEntity({
        ...wh,
        processingStatus: WebhookProcessingStatus.PROCESSED,
      });
      await repo.updateWebhookEvent(updated);

      const foundUpdated = await repo.findWebhookEvent('simulated', 'evt_123');
      expect(foundUpdated?.processingStatus).toBe(WebhookProcessingStatus.PROCESSED);
    });

    it('should save, find, and query invoices', async () => {
      const inv = createMockInvoice();
      await repo.saveInvoice(inv);

      expect(await repo.findInvoiceById('inv-uuid-1')).toEqual(inv);
      expect(await repo.findInvoiceByPublicId('INV-123456')).toEqual(inv);
      expect(await repo.findInvoiceByNumber('INV-202609-1234')).toEqual(inv);
      expect(await repo.findInvoiceByPaymentId('pay-uuid-1')).toEqual(inv);

      expect(await repo.findInvoiceById('missing')).toBeNull();
      expect(await repo.findInvoiceByPublicId('missing')).toBeNull();
      expect(await repo.findInvoiceByNumber('missing')).toBeNull();
      expect(await repo.findInvoiceByPaymentId('missing')).toBeNull();

      const queryRes = await repo.findInvoices({
        patientId: 'pat-uuid-1',
        doctorId: 'doc-uuid-1',
        status: InvoiceStatus.ISSUED,
        offset: 0,
        limit: 10,
      });
      expect(queryRes.total).toBe(1);
    });

    it('should save, find, and query payouts and pending eligible payouts', async () => {
      const po = createMockPayout({ status: DoctorPayoutStatus.ELIGIBLE });
      await repo.savePayout(po);

      expect(await repo.findPayoutById('po-uuid-1')).toEqual(po);
      expect(await repo.findPayoutByPublicId('PO-123456')).toEqual(po);
      expect(await repo.findPayoutByIdempotencyKey('idem-po-1')).toEqual(po);
      expect(await repo.findPayoutByAppointmentId('appt-uuid-1')).toEqual(po);

      expect(await repo.findPayoutById('missing')).toBeNull();
      expect(await repo.findPayoutByPublicId('missing')).toBeNull();
      expect(await repo.findPayoutByIdempotencyKey('missing')).toBeNull();
      expect(await repo.findPayoutByAppointmentId('missing')).toBeNull();

      const list = await repo.findPayouts({
        doctorId: 'doc-uuid-1',
        status: DoctorPayoutStatus.ELIGIBLE,
      });
      expect(list.total).toBe(1);

      const pendingEligible = await repo.findPendingEligiblePayouts();
      expect(pendingEligible).toHaveLength(1);
    });

    it('should save and find financial transactions and clear repo', async () => {
      const tx = createMockTx();
      await repo.saveTransaction(tx);

      const byPay = await repo.findTransactionsByPaymentId('pay-uuid-1');
      expect(byPay).toHaveLength(1);

      const byPo = await repo.findTransactionsByPayoutId('po-uuid-1');
      expect(byPo).toHaveLength(1);

      repo.clear();
      expect(await repo.findPaymentById('pay-uuid-1')).toBeNull();
      expect(await repo.findInvoiceById('inv-uuid-1')).toBeNull();
      expect(await repo.findPayoutById('po-uuid-1')).toBeNull();
    });
  });

  describe('PrismaPaymentRepository', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockPrisma: any;
    let repo: PrismaPaymentRepository;

    const mockRawPayment = {
      id: 'pay-uuid-1',
      publicPaymentId: 'PAY-123456',
      appointmentId: 'appt-uuid-1',
      patientId: 'pat-uuid-1',
      doctorId: 'doc-uuid-1',
      consultationOfferId: 'off-uuid-1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentStatus.CREATED,
      provider: 'simulated',
      providerPaymentId: 'sim_pay_1',
      idempotencyKey: 'idem-pay-1',
      paidAt: null,
      failedAt: null,
      cancelledAt: null,
      failureReason: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    const mockRawAttempt = {
      id: 'att-uuid-1',
      publicAttemptId: 'ATT-123456',
      paymentId: 'pay-uuid-1',
      attemptNumber: 1,
      provider: 'simulated',
      providerAttemptId: 'sim_att_1',
      amount: '100.00',
      currency: 'USD',
      status: PaymentAttemptStatus.INITIATED,
      failureCode: null,
      failureReason: null,
      startedAt: new Date('2026-09-30'),
      completedAt: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    const mockRawWebhook = {
      id: 'wh-uuid-1',
      provider: 'simulated',
      providerEventId: 'evt_123',
      eventType: 'payment.succeeded',
      payloadHash: 'hash',
      payload: '{}',
      processingStatus: WebhookProcessingStatus.RECEIVED,
      receivedAt: new Date('2026-09-30'),
      processedAt: null,
      failureReason: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
    };

    const mockRawInvoice = {
      id: 'inv-uuid-1',
      publicInvoiceId: 'INV-123456',
      invoiceNumber: 'INV-202609-1234',
      paymentId: 'pay-uuid-1',
      appointmentId: 'appt-uuid-1',
      patientId: 'pat-uuid-1',
      doctorId: 'doc-uuid-1',
      subtotal: '100.00',
      taxes: '0.00',
      discount: '0.00',
      platformFee: '15.00',
      total: '100.00',
      currency: 'USD',
      status: InvoiceStatus.ISSUED,
      issuedAt: new Date('2026-09-30'),
      paidAt: null,
      cancelledAt: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    const mockRawPayout = {
      id: 'po-uuid-1',
      publicPayoutId: 'PO-123456',
      doctorId: 'doc-uuid-1',
      appointmentId: 'appt-uuid-1',
      paymentId: 'pay-uuid-1',
      grossAmount: '100.00',
      platformFee: '15.00',
      netAmount: '85.00',
      currency: 'USD',
      status: DoctorPayoutStatus.PENDING,
      providerPayoutId: null,
      idempotencyKey: 'idem-po-1',
      eligibleAt: null,
      processedAt: null,
      paidAt: null,
      failedAt: null,
      cancelledAt: null,
      failureReason: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
      updatedAt: new Date('2026-09-30'),
    };

    const mockRawTx = {
      id: 'tx-uuid-1',
      type: FinancialTransactionType.PAYMENT,
      direction: TransactionDirection.CREDIT,
      amount: '100.00',
      currency: 'USD',
      paymentId: 'pay-uuid-1',
      payoutId: 'po-uuid-1',
      reference: null,
      metadata: null,
      createdAt: new Date('2026-09-30'),
    };

    beforeEach(() => {
      mockPrisma = {
        payment: {
          upsert: vi.fn().mockResolvedValue(mockRawPayment),
          create: vi.fn().mockResolvedValue(mockRawPayment),
          findUnique: vi.fn().mockResolvedValue(mockRawPayment),
          findFirst: vi.fn().mockResolvedValue(mockRawPayment),
          findMany: vi.fn().mockResolvedValue([mockRawPayment]),
          update: vi.fn().mockResolvedValue(mockRawPayment),
          count: vi.fn().mockResolvedValue(1),
        },
        paymentAttempt: {
          create: vi.fn().mockResolvedValue(mockRawAttempt),
          findUnique: vi.fn().mockResolvedValue(mockRawAttempt),
          findMany: vi.fn().mockResolvedValue([mockRawAttempt]),
          update: vi.fn().mockResolvedValue(mockRawAttempt),
        },
        paymentWebhookEvent: {
          create: vi.fn().mockResolvedValue(mockRawWebhook),
          findUnique: vi.fn().mockResolvedValue(mockRawWebhook),
          findFirst: vi.fn().mockResolvedValue(mockRawWebhook),
          update: vi.fn().mockResolvedValue(mockRawWebhook),
        },
        invoice: {
          create: vi.fn().mockResolvedValue(mockRawInvoice),
          findUnique: vi.fn().mockResolvedValue(mockRawInvoice),
          findFirst: vi.fn().mockResolvedValue(mockRawInvoice),
          findMany: vi.fn().mockResolvedValue([mockRawInvoice]),
          update: vi.fn().mockResolvedValue(mockRawInvoice),
          count: vi.fn().mockResolvedValue(1),
        },
        doctorPayout: {
          create: vi.fn().mockResolvedValue(mockRawPayout),
          findUnique: vi.fn().mockResolvedValue(mockRawPayout),
          findFirst: vi.fn().mockResolvedValue(mockRawPayout),
          findMany: vi.fn().mockResolvedValue([mockRawPayout]),
          update: vi.fn().mockResolvedValue(mockRawPayout),
          count: vi.fn().mockResolvedValue(1),
        },
        financialTransaction: {
          create: vi.fn().mockResolvedValue(mockRawTx),
          findMany: vi.fn().mockResolvedValue([mockRawTx]),
        },
      };
      repo = new PrismaPaymentRepository(mockPrisma);
    });

    it('should throw when PrismaClient is not initialized', async () => {
      const uninit = new PrismaPaymentRepository();
      await expect(uninit.savePayment(createMockPayment())).rejects.toThrow(
        'PrismaClient is not initialized in PrismaPaymentRepository',
      );
    });

    it('should save and find payment with Prisma', async () => {
      const p = createMockPayment();
      const saved = await repo.savePayment(p);
      expect(saved.id).toBe('pay-uuid-1');

      const byId = await repo.findPaymentById('pay-uuid-1');
      expect(byId?.publicPaymentId).toBe('PAY-123456');

      const byPublicId = await repo.findPaymentByPublicId('PAY-123456');
      expect(byPublicId?.id).toBe('pay-uuid-1');

      const byKey = await repo.findPaymentByIdempotencyKey('idem-pay-1');
      expect(byKey?.id).toBe('pay-uuid-1');

      const byProvId = await repo.findPaymentByProviderPaymentId('sim_pay_1');
      expect(byProvId?.id).toBe('pay-uuid-1');

      const byAppt = await repo.findPaymentByAppointmentId('appt-uuid-1');
      expect(byAppt?.id).toBe('pay-uuid-1');

      const queryRes = await repo.findPayments({
        patientId: 'pat-uuid-1',
        doctorId: 'doc-uuid-1',
        appointmentId: 'appt-uuid-1',
        status: PaymentStatus.CREATED,
      });
      expect(queryRes.total).toBe(1);
    });

    it('should save and find attempts with Prisma', async () => {
      const att = createMockAttempt();
      await repo.saveAttempt(att);

      const attempts = await repo.findAttemptsByPaymentId('pay-uuid-1');
      expect(attempts).toHaveLength(1);
    });

    it('should save and find webhooks with Prisma', async () => {
      const wh = createMockWebhook();
      await repo.saveWebhookEvent(wh);

      const found = await repo.findWebhookEvent('simulated', 'evt_123');
      expect(found?.eventType).toBe('payment.succeeded');

      await repo.updateWebhookEvent(wh);
      expect(mockPrisma.paymentWebhookEvent.update).toHaveBeenCalled();
    });

    it('should save, find, and query invoices with Prisma', async () => {
      const inv = createMockInvoice();
      await repo.saveInvoice(inv);

      expect((await repo.findInvoiceById('inv-uuid-1'))?.id).toBe('inv-uuid-1');
      expect((await repo.findInvoiceByPublicId('INV-123456'))?.id).toBe('inv-uuid-1');
      expect((await repo.findInvoiceByNumber('INV-202609-1234'))?.id).toBe('inv-uuid-1');
      expect((await repo.findInvoiceByPaymentId('pay-uuid-1'))?.id).toBe('inv-uuid-1');

      const queried = await repo.findInvoices({
        patientId: 'pat-uuid-1',
        doctorId: 'doc-uuid-1',
        status: InvoiceStatus.ISSUED,
      });
      expect(queried.total).toBe(1);
    });

    it('should save, find, and query payouts with Prisma', async () => {
      const po = createMockPayout();
      await repo.savePayout(po);

      expect((await repo.findPayoutById('po-uuid-1'))?.id).toBe('po-uuid-1');
      expect((await repo.findPayoutByPublicId('PO-123456'))?.id).toBe('po-uuid-1');
      expect((await repo.findPayoutByIdempotencyKey('idem-po-1'))?.id).toBe('po-uuid-1');
      expect((await repo.findPayoutByAppointmentId('appt-uuid-1'))?.id).toBe('po-uuid-1');

      const queried = await repo.findPayouts({
        doctorId: 'doc-uuid-1',
        status: DoctorPayoutStatus.PENDING,
      });
      expect(queried.total).toBe(1);

      const pending = await repo.findPendingEligiblePayouts();
      expect(pending).toHaveLength(1);
    });

    it('should save and find financial transactions with Prisma', async () => {
      const tx = createMockTx();
      await repo.saveTransaction(tx);

      const byPay = await repo.findTransactionsByPaymentId('pay-uuid-1');
      expect(byPay).toHaveLength(1);

      const byPo = await repo.findTransactionsByPayoutId('po-uuid-1');
      expect(byPo).toHaveLength(1);
    });
  });
});
