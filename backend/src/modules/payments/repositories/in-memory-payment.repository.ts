import { Injectable } from '@nestjs/common';
import type {
  IPaymentRepository,
  FindPaymentsQuery,
  FindInvoicesQuery,
  FindPayoutsQuery,
} from '../interfaces/payment-repository.interface.js';
import type { PaymentEntity } from '../entities/payment.entity.js';
import type { PaymentAttemptEntity } from '../entities/payment-attempt.entity.js';
import type { InvoiceEntity } from '../entities/invoice.entity.js';
import type { DoctorPayoutEntity } from '../entities/doctor-payout.entity.js';
import type { FinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import type { PaymentWebhookEventEntity } from '../entities/payment-webhook-event.entity.js';
import { DoctorPayoutStatus } from '../enums/doctor-payout-status.enum.js';

@Injectable()
export class InMemoryPaymentRepository implements IPaymentRepository {
  private payments = new Map<string, PaymentEntity>();
  private attempts = new Map<string, PaymentAttemptEntity>();
  private webhookEvents = new Map<string, PaymentWebhookEventEntity>();
  private invoices = new Map<string, InvoiceEntity>();
  private payouts = new Map<string, DoctorPayoutEntity>();
  private transactions = new Map<string, FinancialTransactionEntity>();

  public async savePayment(payment: PaymentEntity): Promise<PaymentEntity> {
    this.payments.set(payment.id, payment);
    return payment;
  }

  public async findPaymentById(id: string): Promise<PaymentEntity | null> {
    return this.payments.get(id) ?? null;
  }

  public async findPaymentByPublicId(publicPaymentId: string): Promise<PaymentEntity | null> {
    for (const payment of this.payments.values()) {
      if (payment.publicPaymentId === publicPaymentId) {
        return payment;
      }
    }
    return null;
  }

  public async findPaymentByIdempotencyKey(key: string): Promise<PaymentEntity | null> {
    for (const payment of this.payments.values()) {
      if (payment.idempotencyKey === key) {
        return payment;
      }
    }
    return null;
  }

  public async findPaymentByProviderPaymentId(
    providerPaymentId: string,
  ): Promise<PaymentEntity | null> {
    for (const payment of this.payments.values()) {
      if (payment.providerPaymentId === providerPaymentId) {
        return payment;
      }
    }
    return null;
  }

  public async findPaymentByAppointmentId(appointmentId: string): Promise<PaymentEntity | null> {
    for (const payment of this.payments.values()) {
      if (payment.appointmentId === appointmentId) {
        return payment;
      }
    }
    return null;
  }

  public async findPayments(
    query: FindPaymentsQuery,
  ): Promise<{ items: PaymentEntity[]; total: number }> {
    let result = Array.from(this.payments.values());

    if (query.patientId) {
      result = result.filter((p) => p.patientId === query.patientId);
    }
    if (query.doctorId) {
      result = result.filter((p) => p.doctorId === query.doctorId);
    }
    if (query.appointmentId) {
      result = result.filter((p) => p.appointmentId === query.appointmentId);
    }
    if (query.status) {
      result = result.filter((p) => p.status === query.status);
    }

    const total = result.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const items = result.slice(offset, offset + limit);

    return { items, total };
  }

  public async saveAttempt(attempt: PaymentAttemptEntity): Promise<PaymentAttemptEntity> {
    this.attempts.set(attempt.id, attempt);
    return attempt;
  }

  public async findAttemptsByPaymentId(paymentId: string): Promise<PaymentAttemptEntity[]> {
    return Array.from(this.attempts.values()).filter((a) => a.paymentId === paymentId);
  }

  public async saveWebhookEvent(
    event: PaymentWebhookEventEntity,
  ): Promise<PaymentWebhookEventEntity> {
    const key = `${event.provider}:${event.providerEventId}`;
    this.webhookEvents.set(key, event);
    return event;
  }

  public async findWebhookEvent(
    provider: string,
    providerEventId: string,
  ): Promise<PaymentWebhookEventEntity | null> {
    const key = `${provider}:${providerEventId}`;
    return this.webhookEvents.get(key) ?? null;
  }

  public async updateWebhookEvent(
    event: PaymentWebhookEventEntity,
  ): Promise<PaymentWebhookEventEntity> {
    const key = `${event.provider}:${event.providerEventId}`;
    this.webhookEvents.set(key, event);
    return event;
  }

  public async saveInvoice(invoice: InvoiceEntity): Promise<InvoiceEntity> {
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  public async findInvoiceById(id: string): Promise<InvoiceEntity | null> {
    return this.invoices.get(id) ?? null;
  }

  public async findInvoiceByPublicId(publicInvoiceId: string): Promise<InvoiceEntity | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.publicInvoiceId === publicInvoiceId) {
        return invoice;
      }
    }
    return null;
  }

  public async findInvoiceByNumber(invoiceNumber: string): Promise<InvoiceEntity | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.invoiceNumber === invoiceNumber) {
        return invoice;
      }
    }
    return null;
  }

  public async findInvoiceByPaymentId(paymentId: string): Promise<InvoiceEntity | null> {
    for (const invoice of this.invoices.values()) {
      if (invoice.paymentId === paymentId) {
        return invoice;
      }
    }
    return null;
  }

  public async findInvoices(
    query: FindInvoicesQuery,
  ): Promise<{ items: InvoiceEntity[]; total: number }> {
    let result = Array.from(this.invoices.values());

    if (query.patientId) {
      result = result.filter((i) => i.patientId === query.patientId);
    }
    if (query.doctorId) {
      result = result.filter((i) => i.doctorId === query.doctorId);
    }
    if (query.status) {
      result = result.filter((i) => i.status === query.status);
    }

    const total = result.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const items = result.slice(offset, offset + limit);

    return { items, total };
  }

  public async savePayout(payout: DoctorPayoutEntity): Promise<DoctorPayoutEntity> {
    this.payouts.set(payout.id, payout);
    return payout;
  }

  public async findPayoutById(id: string): Promise<DoctorPayoutEntity | null> {
    return this.payouts.get(id) ?? null;
  }

  public async findPayoutByPublicId(publicPayoutId: string): Promise<DoctorPayoutEntity | null> {
    for (const payout of this.payouts.values()) {
      if (payout.publicPayoutId === publicPayoutId) {
        return payout;
      }
    }
    return null;
  }

  public async findPayoutByIdempotencyKey(key: string): Promise<DoctorPayoutEntity | null> {
    for (const payout of this.payouts.values()) {
      if (payout.idempotencyKey === key) {
        return payout;
      }
    }
    return null;
  }

  public async findPayoutByAppointmentId(
    appointmentId: string,
  ): Promise<DoctorPayoutEntity | null> {
    for (const payout of this.payouts.values()) {
      if (payout.appointmentId === appointmentId) {
        return payout;
      }
    }
    return null;
  }

  public async findPayouts(
    query: FindPayoutsQuery,
  ): Promise<{ items: DoctorPayoutEntity[]; total: number }> {
    let result = Array.from(this.payouts.values());

    if (query.doctorId) {
      result = result.filter((p) => p.doctorId === query.doctorId);
    }
    if (query.status) {
      result = result.filter((p) => p.status === query.status);
    }

    const total = result.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const items = result.slice(offset, offset + limit);

    return { items, total };
  }

  public async findPendingEligiblePayouts(): Promise<DoctorPayoutEntity[]> {
    return Array.from(this.payouts.values()).filter(
      (p) => p.status === DoctorPayoutStatus.ELIGIBLE || p.status === DoctorPayoutStatus.PENDING,
    );
  }

  public async saveTransaction(
    transaction: FinancialTransactionEntity,
  ): Promise<FinancialTransactionEntity> {
    this.transactions.set(transaction.id, transaction);
    return transaction;
  }

  public async findTransactionsByPaymentId(
    paymentId: string,
  ): Promise<FinancialTransactionEntity[]> {
    return Array.from(this.transactions.values()).filter((t) => t.paymentId === paymentId);
  }

  public async findTransactionsByPayoutId(payoutId: string): Promise<FinancialTransactionEntity[]> {
    return Array.from(this.transactions.values()).filter((t) => t.payoutId === payoutId);
  }

  public clear(): void {
    this.payments.clear();
    this.attempts.clear();
    this.webhookEvents.clear();
    this.invoices.clear();
    this.payouts.clear();
    this.transactions.clear();
  }
}
