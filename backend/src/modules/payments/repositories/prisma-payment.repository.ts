import { Injectable, Optional } from '@nestjs/common';
import type {
  IPaymentRepository,
  FindPaymentsQuery,
  FindInvoicesQuery,
  FindPayoutsQuery,
} from '../interfaces/payment-repository.interface.js';
import { PaymentEntity } from '../entities/payment.entity.js';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity.js';
import { InvoiceEntity } from '../entities/invoice.entity.js';
import { DoctorPayoutEntity } from '../entities/doctor-payout.entity.js';
import { FinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { PaymentWebhookEventEntity } from '../entities/payment-webhook-event.entity.js';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { PaymentAttemptStatus } from '../enums/payment-attempt-status.enum.js';
import { InvoiceStatus } from '../enums/invoice-status.enum.js';
import { DoctorPayoutStatus } from '../enums/doctor-payout-status.enum.js';
import { FinancialTransactionType } from '../enums/financial-transaction-type.enum.js';
import { TransactionDirection } from '../enums/transaction-direction.enum.js';
import { WebhookProcessingStatus } from '../enums/webhook-processing-status.enum.js';

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  upsert?(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<T>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaClientLike {
  payment: PrismaModelDelegate;
  paymentAttempt: PrismaModelDelegate;
  paymentWebhookEvent: PrismaModelDelegate;
  invoice: PrismaModelDelegate;
  doctorPayout: PrismaModelDelegate;
  financialTransaction: PrismaModelDelegate;
}

@Injectable()
export class PrismaPaymentRepository implements IPaymentRepository {
  private readonly prisma?: PrismaClientLike | undefined;

  public constructor(@Optional() prisma?: PrismaClientLike | undefined) {
    this.prisma = prisma;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaPaymentRepository. Provide a valid Prisma client or use InMemoryPaymentRepository.',
      );
    }
    return this.prisma;
  }

  // --- Payments ---

  public async savePayment(payment: PaymentEntity): Promise<PaymentEntity> {
    const client = this.getClient();
    const data = {
      id: payment.id,
      publicPaymentId: payment.publicPaymentId,
      appointmentId: payment.appointmentId,
      patientId: payment.patientId,
      doctorId: payment.doctorId,
      consultationOfferId: payment.consultationOfferId ?? null,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? null,
      idempotencyKey: payment.idempotencyKey ?? null,
      paidAt: payment.paidAt ?? null,
      failedAt: payment.failedAt ?? null,
      cancelledAt: payment.cancelledAt ?? null,
      failureReason: payment.failureReason ?? null,
      metadata: payment.metadata ? JSON.stringify(payment.metadata) : null,
      updatedAt: new Date(),
    };

    if (client.payment.upsert) {
      const raw = await client.payment.upsert({
        where: { id: payment.id },
        create: { ...data, createdAt: payment.createdAt },
        update: data,
      });
      return this.mapToPayment(raw);
    }

    const existing = await client.payment.findUnique({ where: { id: payment.id } });
    if (existing) {
      const raw = await client.payment.update({ where: { id: payment.id }, data });
      return this.mapToPayment(raw);
    } else {
      const raw = await client.payment.create({ data: { ...data, createdAt: payment.createdAt } });
      return this.mapToPayment(raw);
    }
  }

  public async findPaymentById(id: string): Promise<PaymentEntity | null> {
    const client = this.getClient();
    const raw = await client.payment.findUnique({ where: { id } });
    return raw ? this.mapToPayment(raw) : null;
  }

  public async findPaymentByPublicId(publicPaymentId: string): Promise<PaymentEntity | null> {
    const client = this.getClient();
    const raw = await client.payment.findUnique({ where: { publicPaymentId } });
    return raw ? this.mapToPayment(raw) : null;
  }

  public async findPaymentByIdempotencyKey(key: string): Promise<PaymentEntity | null> {
    const client = this.getClient();
    const raw = client.payment.findFirst
      ? await client.payment.findFirst({ where: { idempotencyKey: key } })
      : await client.payment.findUnique({ where: { idempotencyKey: key } });
    return raw ? this.mapToPayment(raw) : null;
  }

  public async findPaymentByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<PaymentEntity | null> {
    const client = this.getClient();
    if (!client.payment.findFirst) return null;
    const raw = await client.payment.findFirst({ where: { providerPaymentId } });
    return raw ? this.mapToPayment(raw) : null;
  }

  public async findPaymentByAppointmentId(appointmentId: string): Promise<PaymentEntity | null> {
    const client = this.getClient();
    if (!client.payment.findFirst) return null;
    const raw = await client.payment.findFirst({ where: { appointmentId } });
    return raw ? this.mapToPayment(raw) : null;
  }

  public async findPayments(
    query: FindPaymentsQuery,
  ): Promise<{ items: PaymentEntity[]; total: number }> {
    const client = this.getClient();
    const where: Record<string, unknown> = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.appointmentId) where.appointmentId = query.appointmentId;
    if (query.status) where.status = query.status;

    const [rawItems, total] = await Promise.all([
      client.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
      }),
      client.payment.count ? client.payment.count({ where }) : Promise.resolve(0),
    ]);

    return {
      items: rawItems.map((r) => this.mapToPayment(r)),
      total: total || rawItems.length,
    };
  }

  // --- Payment Attempts ---

  public async saveAttempt(attempt: PaymentAttemptEntity): Promise<PaymentAttemptEntity> {
    const client = this.getClient();
    const data = {
      id: attempt.id,
      publicAttemptId: attempt.publicAttemptId,
      paymentId: attempt.paymentId,
      attemptNumber: attempt.attemptNumber,
      provider: attempt.provider,
      providerAttemptId: attempt.providerAttemptId ?? null,
      amount: attempt.amount,
      currency: attempt.currency,
      status: attempt.status,
      failureCode: attempt.failureCode ?? null,
      failureReason: attempt.failureReason ?? null,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt ?? null,
      metadata: attempt.metadata ? JSON.stringify(attempt.metadata) : null,
      createdAt: attempt.createdAt,
      updatedAt: new Date(),
    };

    const existing = await client.paymentAttempt.findUnique({ where: { id: attempt.id } });
    const raw = existing
      ? await client.paymentAttempt.update({ where: { id: attempt.id }, data })
      : await client.paymentAttempt.create({ data });

    return this.mapToAttempt(raw);
  }

  public async findAttemptsByPaymentId(paymentId: string): Promise<PaymentAttemptEntity[]> {
    const client = this.getClient();
    const rawItems = await client.paymentAttempt.findMany({
      where: { paymentId },
      orderBy: { attemptNumber: 'asc' },
    });
    return rawItems.map((r) => this.mapToAttempt(r));
  }

  // --- Webhook Events ---

  public async saveWebhookEvent(
    event: PaymentWebhookEventEntity,
  ): Promise<PaymentWebhookEventEntity> {
    const client = this.getClient();
    const raw = await client.paymentWebhookEvent.create({
      data: {
        id: event.id,
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        payloadHash: event.payloadHash,
        payload: event.payload,
        processingStatus: event.processingStatus,
        receivedAt: event.receivedAt,
        processedAt: event.processedAt ?? null,
        failureReason: event.failureReason ?? null,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        createdAt: event.createdAt,
      },
    });
    return this.mapToWebhookEvent(raw);
  }

  public async findWebhookEvent(
    provider: string,
    providerEventId: string,
  ): Promise<PaymentWebhookEventEntity | null> {
    const client = this.getClient();
    if (!client.paymentWebhookEvent.findFirst) return null;
    const raw = await client.paymentWebhookEvent.findFirst({
      where: { provider, providerEventId },
    });
    return raw ? this.mapToWebhookEvent(raw) : null;
  }

  public async updateWebhookEvent(
    event: PaymentWebhookEventEntity,
  ): Promise<PaymentWebhookEventEntity> {
    const client = this.getClient();
    const raw = await client.paymentWebhookEvent.update({
      where: { id: event.id },
      data: {
        processingStatus: event.processingStatus,
        processedAt: event.processedAt ?? null,
        failureReason: event.failureReason ?? null,
      },
    });
    return this.mapToWebhookEvent(raw);
  }

  // --- Invoices ---

  public async saveInvoice(invoice: InvoiceEntity): Promise<InvoiceEntity> {
    const client = this.getClient();
    const data = {
      id: invoice.id,
      publicInvoiceId: invoice.publicInvoiceId,
      invoiceNumber: invoice.invoiceNumber,
      paymentId: invoice.paymentId,
      appointmentId: invoice.appointmentId,
      patientId: invoice.patientId,
      doctorId: invoice.doctorId,
      subtotal: invoice.subtotal,
      taxes: invoice.taxes,
      discount: invoice.discount,
      platformFee: invoice.platformFee,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
      issuedAt: invoice.issuedAt,
      paidAt: invoice.paidAt ?? null,
      cancelledAt: invoice.cancelledAt ?? null,
      metadata: invoice.metadata ? JSON.stringify(invoice.metadata) : null,
      createdAt: invoice.createdAt,
      updatedAt: new Date(),
    };

    const existing = await client.invoice.findUnique({ where: { id: invoice.id } });
    const raw = existing
      ? await client.invoice.update({ where: { id: invoice.id }, data })
      : await client.invoice.create({ data });

    return this.mapToInvoice(raw);
  }

  public async findInvoiceById(id: string): Promise<InvoiceEntity | null> {
    const client = this.getClient();
    const raw = await client.invoice.findUnique({ where: { id } });
    return raw ? this.mapToInvoice(raw) : null;
  }

  public async findInvoiceByPublicId(publicInvoiceId: string): Promise<InvoiceEntity | null> {
    const client = this.getClient();
    const raw = await client.invoice.findUnique({ where: { publicInvoiceId } });
    return raw ? this.mapToInvoice(raw) : null;
  }

  public async findInvoiceByNumber(invoiceNumber: string): Promise<InvoiceEntity | null> {
    const client = this.getClient();
    const raw = await client.invoice.findUnique({ where: { invoiceNumber } });
    return raw ? this.mapToInvoice(raw) : null;
  }

  public async findInvoiceByPaymentId(paymentId: string): Promise<InvoiceEntity | null> {
    const client = this.getClient();
    if (!client.invoice.findFirst) return null;
    const raw = await client.invoice.findFirst({ where: { paymentId } });
    return raw ? this.mapToInvoice(raw) : null;
  }

  public async findInvoices(
    query: FindInvoicesQuery,
  ): Promise<{ items: InvoiceEntity[]; total: number }> {
    const client = this.getClient();
    const where: Record<string, unknown> = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.status) where.status = query.status;

    const [rawItems, total] = await Promise.all([
      client.invoice.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
      }),
      client.invoice.count ? client.invoice.count({ where }) : Promise.resolve(0),
    ]);

    return {
      items: rawItems.map((r) => this.mapToInvoice(r)),
      total: total || rawItems.length,
    };
  }

  // --- Doctor Payouts ---

  public async savePayout(payout: DoctorPayoutEntity): Promise<DoctorPayoutEntity> {
    const client = this.getClient();
    const data = {
      id: payout.id,
      publicPayoutId: payout.publicPayoutId,
      doctorId: payout.doctorId,
      appointmentId: payout.appointmentId,
      paymentId: payout.paymentId,
      grossAmount: payout.grossAmount,
      platformFee: payout.platformFee,
      taxWithheld: payout.taxWithheld,
      providerFee: payout.providerFee,
      netAmount: payout.netAmount,
      currency: payout.currency,
      status: payout.status,
      provider: payout.provider ?? null,
      providerPayoutId: payout.providerPayoutId ?? null,
      idempotencyKey: payout.idempotencyKey ?? null,
      eligibleAt: payout.eligibleAt ?? null,
      scheduledAt: payout.scheduledAt ?? null,
      processedAt: payout.processedAt ?? null,
      failedAt: payout.failedAt ?? null,
      cancelledAt: payout.cancelledAt ?? null,
      failureReason: payout.failureReason ?? null,
      metadata: payout.metadata ? JSON.stringify(payout.metadata) : null,
      createdAt: payout.createdAt,
      updatedAt: new Date(),
    };

    const existing = await client.doctorPayout.findUnique({ where: { id: payout.id } });
    const raw = existing
      ? await client.doctorPayout.update({ where: { id: payout.id }, data })
      : await client.doctorPayout.create({ data });

    return this.mapToPayout(raw);
  }

  public async findPayoutById(id: string): Promise<DoctorPayoutEntity | null> {
    const client = this.getClient();
    const raw = await client.doctorPayout.findUnique({ where: { id } });
    return raw ? this.mapToPayout(raw) : null;
  }

  public async findPayoutByPublicId(publicPayoutId: string): Promise<DoctorPayoutEntity | null> {
    const client = this.getClient();
    const raw = await client.doctorPayout.findUnique({ where: { publicPayoutId } });
    return raw ? this.mapToPayout(raw) : null;
  }

  public async findPayoutByIdempotencyKey(key: string): Promise<DoctorPayoutEntity | null> {
    const client = this.getClient();
    if (!client.doctorPayout.findFirst) return null;
    const raw = await client.doctorPayout.findFirst({ where: { idempotencyKey: key } });
    return raw ? this.mapToPayout(raw) : null;
  }

  public async findPayoutByAppointmentId(
    appointmentId: string,
  ): Promise<DoctorPayoutEntity | null> {
    const client = this.getClient();
    if (!client.doctorPayout.findFirst) return null;
    const raw = await client.doctorPayout.findFirst({ where: { appointmentId } });
    return raw ? this.mapToPayout(raw) : null;
  }

  public async findPayouts(
    query: FindPayoutsQuery,
  ): Promise<{ items: DoctorPayoutEntity[]; total: number }> {
    const client = this.getClient();
    const where: Record<string, unknown> = {};
    if (query.doctorId) where.doctorId = query.doctorId;
    if (query.status) where.status = query.status;

    const [rawItems, total] = await Promise.all([
      client.doctorPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.offset ?? 0,
        take: query.limit ?? 20,
      }),
      client.doctorPayout.count ? client.doctorPayout.count({ where }) : Promise.resolve(0),
    ]);

    return {
      items: rawItems.map((r) => this.mapToPayout(r)),
      total: total || rawItems.length,
    };
  }

  public async findPendingEligiblePayouts(): Promise<DoctorPayoutEntity[]> {
    const client = this.getClient();
    const rawItems = await client.doctorPayout.findMany({
      where: {
        status: { in: [DoctorPayoutStatus.PENDING, DoctorPayoutStatus.ELIGIBLE] },
      },
    });
    return rawItems.map((r) => this.mapToPayout(r));
  }

  // --- Financial Transactions ---

  public async saveTransaction(
    transaction: FinancialTransactionEntity,
  ): Promise<FinancialTransactionEntity> {
    const client = this.getClient();
    const raw = await client.financialTransaction.create({
      data: {
        id: transaction.id,
        publicTransactionId: transaction.publicTransactionId,
        type: transaction.type,
        direction: transaction.direction,
        amount: transaction.amount,
        currency: transaction.currency,
        paymentId: transaction.paymentId ?? null,
        payoutId: transaction.payoutId ?? null,
        refundId: transaction.refundId ?? null,
        reference: transaction.reference ?? null,
        status: transaction.status,
        occurredAt: transaction.occurredAt,
        metadata: transaction.metadata ? JSON.stringify(transaction.metadata) : null,
        createdAt: transaction.createdAt,
      },
    });
    return this.mapToTransaction(raw);
  }

  public async findTransactionsByPaymentId(
    paymentId: string,
  ): Promise<FinancialTransactionEntity[]> {
    const client = this.getClient();
    const rawItems = await client.financialTransaction.findMany({
      where: { paymentId },
      orderBy: { occurredAt: 'asc' },
    });
    return rawItems.map((r) => this.mapToTransaction(r));
  }

  public async findTransactionsByPayoutId(payoutId: string): Promise<FinancialTransactionEntity[]> {
    const client = this.getClient();
    const rawItems = await client.financialTransaction.findMany({
      where: { payoutId },
      orderBy: { occurredAt: 'asc' },
    });
    return rawItems.map((r) => this.mapToTransaction(r));
  }

  // --- Entity Mappers ---

  private mapToPayment(raw: Record<string, unknown>): PaymentEntity {
    return new PaymentEntity({
      id: raw.id as string,
      publicPaymentId: raw.publicPaymentId as string,
      appointmentId: raw.appointmentId as string,
      patientId: raw.patientId as string,
      doctorId: raw.doctorId as string,
      consultationOfferId: raw.consultationOfferId as string | null,
      amount: String(raw.amount),
      currency: raw.currency as string,
      status: raw.status as PaymentStatus,
      provider: raw.provider as string,
      providerPaymentId: raw.providerPaymentId as string | null,
      idempotencyKey: raw.idempotencyKey as string | null,
      paidAt: raw.paidAt ? new Date(raw.paidAt as string | Date) : null,
      failedAt: raw.failedAt ? new Date(raw.failedAt as string | Date) : null,
      cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt as string | Date) : null,
      failureReason: raw.failureReason as string | null,
      metadata: raw.metadata ? JSON.parse(raw.metadata as string) : null,
      createdAt: new Date(raw.createdAt as string | Date),
      updatedAt: new Date(raw.updatedAt as string | Date),
    });
  }

  private mapToAttempt(raw: Record<string, unknown>): PaymentAttemptEntity {
    return new PaymentAttemptEntity({
      id: raw.id as string,
      publicAttemptId: raw.publicAttemptId as string,
      paymentId: raw.paymentId as string,
      attemptNumber: Number(raw.attemptNumber),
      provider: raw.provider as string,
      providerAttemptId: raw.providerAttemptId as string | null,
      amount: String(raw.amount),
      currency: raw.currency as string,
      status: raw.status as PaymentAttemptStatus,
      failureCode: raw.failureCode as string | null,
      failureReason: raw.failureReason as string | null,
      startedAt: new Date(raw.startedAt as string | Date),
      completedAt: raw.completedAt ? new Date(raw.completedAt as string | Date) : null,
      metadata: raw.metadata ? JSON.parse(raw.metadata as string) : null,
      createdAt: new Date(raw.createdAt as string | Date),
      updatedAt: new Date(raw.updatedAt as string | Date),
    });
  }

  private mapToWebhookEvent(raw: Record<string, unknown>): PaymentWebhookEventEntity {
    return new PaymentWebhookEventEntity({
      id: raw.id as string,
      provider: raw.provider as string,
      providerEventId: raw.providerEventId as string,
      eventType: raw.eventType as string,
      payloadHash: raw.payloadHash as string,
      payload: raw.payload as string,
      processingStatus: raw.processingStatus as WebhookProcessingStatus,
      receivedAt: new Date(raw.receivedAt as string | Date),
      processedAt: raw.processedAt ? new Date(raw.processedAt as string | Date) : null,
      failureReason: raw.failureReason as string | null,
      metadata: raw.metadata ? JSON.parse(raw.metadata as string) : null,
      createdAt: new Date(raw.createdAt as string | Date),
    });
  }

  private mapToInvoice(raw: Record<string, unknown>): InvoiceEntity {
    return new InvoiceEntity({
      id: raw.id as string,
      publicInvoiceId: raw.publicInvoiceId as string,
      invoiceNumber: raw.invoiceNumber as string,
      paymentId: raw.paymentId as string,
      appointmentId: raw.appointmentId as string,
      patientId: raw.patientId as string,
      doctorId: raw.doctorId as string,
      subtotal: String(raw.subtotal),
      taxes: String(raw.taxes),
      discount: String(raw.discount),
      platformFee: String(raw.platformFee),
      total: String(raw.total),
      currency: raw.currency as string,
      status: raw.status as InvoiceStatus,
      issuedAt: new Date(raw.issuedAt as string | Date),
      paidAt: raw.paidAt ? new Date(raw.paidAt as string | Date) : null,
      cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt as string | Date) : null,
      metadata: raw.metadata ? JSON.parse(raw.metadata as string) : null,
      createdAt: new Date(raw.createdAt as string | Date),
      updatedAt: new Date(raw.updatedAt as string | Date),
    });
  }

  private mapToPayout(raw: Record<string, unknown>): DoctorPayoutEntity {
    return new DoctorPayoutEntity({
      id: raw.id as string,
      publicPayoutId: raw.publicPayoutId as string,
      doctorId: raw.doctorId as string,
      appointmentId: raw.appointmentId as string,
      paymentId: raw.paymentId as string,
      grossAmount: String(raw.grossAmount),
      platformFee: String(raw.platformFee),
      taxWithheld: String(raw.taxWithheld),
      providerFee: String(raw.providerFee),
      netAmount: String(raw.netAmount),
      currency: raw.currency as string,
      status: raw.status as DoctorPayoutStatus,
      provider: raw.provider as string | null,
      providerPayoutId: raw.providerPayoutId as string | null,
      idempotencyKey: raw.idempotencyKey as string | null,
      eligibleAt: raw.eligibleAt ? new Date(raw.eligibleAt as string | Date) : null,
      scheduledAt: raw.scheduledAt ? new Date(raw.scheduledAt as string | Date) : null,
      processedAt: raw.processedAt ? new Date(raw.processedAt as string | Date) : null,
      failedAt: raw.failedAt ? new Date(raw.failedAt as string | Date) : null,
      cancelledAt: raw.cancelledAt ? new Date(raw.cancelledAt as string | Date) : null,
      failureReason: raw.failureReason as string | null,
      metadata: raw.metadata ? JSON.parse(raw.metadata as string) : null,
      createdAt: new Date(raw.createdAt as string | Date),
      updatedAt: new Date(raw.updatedAt as string | Date),
    });
  }

  private mapToTransaction(raw: Record<string, unknown>): FinancialTransactionEntity {
    return new FinancialTransactionEntity({
      id: raw.id as string,
      publicTransactionId: raw.publicTransactionId as string,
      type: raw.type as FinancialTransactionType,
      direction: raw.direction as TransactionDirection,
      amount: String(raw.amount),
      currency: raw.currency as string,
      paymentId: raw.paymentId as string | null,
      payoutId: raw.payoutId as string | null,
      refundId: raw.refundId as string | null,
      reference: raw.reference as string | null,
      status: raw.status as string,
      occurredAt: new Date(raw.occurredAt as string | Date),
      metadata: raw.metadata ? JSON.parse(raw.metadata as string) : null,
      createdAt: new Date(raw.createdAt as string | Date),
    });
  }
}
