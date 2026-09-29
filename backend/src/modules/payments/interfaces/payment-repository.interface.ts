import type { PaymentEntity } from '../entities/payment.entity.js';
import type { PaymentAttemptEntity } from '../entities/payment-attempt.entity.js';
import type { InvoiceEntity } from '../entities/invoice.entity.js';
import type { DoctorPayoutEntity } from '../entities/doctor-payout.entity.js';
import type { FinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import type { PaymentWebhookEventEntity } from '../entities/payment-webhook-event.entity.js';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface FindPaymentsQuery {
  patientId?: string;
  doctorId?: string;
  appointmentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface FindInvoicesQuery {
  patientId?: string;
  doctorId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface FindPayoutsQuery {
  doctorId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface IPaymentRepository {
  // Payments
  savePayment(payment: PaymentEntity): Promise<PaymentEntity>;
  findPaymentById(id: string): Promise<PaymentEntity | null>;
  findPaymentByPublicId(publicPaymentId: string): Promise<PaymentEntity | null>;
  findPaymentByIdempotencyKey(key: string): Promise<PaymentEntity | null>;
  findPaymentByProviderPaymentId(providerPaymentId: string): Promise<PaymentEntity | null>;
  findPaymentByAppointmentId(appointmentId: string): Promise<PaymentEntity | null>;
  findPayments(query: FindPaymentsQuery): Promise<{ items: PaymentEntity[]; total: number }>;

  // Payment Attempts
  saveAttempt(attempt: PaymentAttemptEntity): Promise<PaymentAttemptEntity>;
  findAttemptsByPaymentId(paymentId: string): Promise<PaymentAttemptEntity[]>;

  // Webhook Events
  saveWebhookEvent(event: PaymentWebhookEventEntity): Promise<PaymentWebhookEventEntity>;
  findWebhookEvent(
    provider: string,
    providerEventId: string,
  ): Promise<PaymentWebhookEventEntity | null>;
  updateWebhookEvent(event: PaymentWebhookEventEntity): Promise<PaymentWebhookEventEntity>;

  // Invoices
  saveInvoice(invoice: InvoiceEntity): Promise<InvoiceEntity>;
  findInvoiceById(id: string): Promise<InvoiceEntity | null>;
  findInvoiceByPublicId(publicInvoiceId: string): Promise<InvoiceEntity | null>;
  findInvoiceByNumber(invoiceNumber: string): Promise<InvoiceEntity | null>;
  findInvoiceByPaymentId(paymentId: string): Promise<InvoiceEntity | null>;
  findInvoices(query: FindInvoicesQuery): Promise<{ items: InvoiceEntity[]; total: number }>;

  // Doctor Payouts
  savePayout(payout: DoctorPayoutEntity): Promise<DoctorPayoutEntity>;
  findPayoutById(id: string): Promise<DoctorPayoutEntity | null>;
  findPayoutByPublicId(publicPayoutId: string): Promise<DoctorPayoutEntity | null>;
  findPayoutByIdempotencyKey(key: string): Promise<DoctorPayoutEntity | null>;
  findPayoutByAppointmentId(appointmentId: string): Promise<DoctorPayoutEntity | null>;
  findPayouts(query: FindPayoutsQuery): Promise<{ items: DoctorPayoutEntity[]; total: number }>;
  findPendingEligiblePayouts(): Promise<DoctorPayoutEntity[]>;

  // Financial Transactions
  saveTransaction(transaction: FinancialTransactionEntity): Promise<FinancialTransactionEntity>;
  findTransactionsByPaymentId(paymentId: string): Promise<FinancialTransactionEntity[]>;
  findTransactionsByPayoutId(payoutId: string): Promise<FinancialTransactionEntity[]>;
}
