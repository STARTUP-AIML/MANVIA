export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'SUCCEEDED';

export type PaymentAttemptStatus = 'INITIATED' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'REFUNDED';

export type DoctorPayoutStatus =
  | 'ELIGIBLE'
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'HELD';

export type RefundStatus =
  | 'REQUESTED'
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED';

export interface PaymentAttemptResponseDto {
  id: string;
  publicAttemptId: string;
  attemptNumber: number;
  provider: string;
  providerAttemptId?: string | null;
  amount: string;
  currency: string;
  status: string;
  failureCode?: string | null;
  failureReason?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface PaymentResponseDto {
  id: string;
  publicPaymentId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId?: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId?: string | null;
  idempotencyKey?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  attempts?: PaymentAttemptResponseDto[];
  clientSecret?: string;
  checkoutUrl?: string;
}

export interface CreatePaymentDto {
  appointmentId: string;
  provider?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentDto {
  providerPaymentId?: string;
  signature?: string;
}

export interface PaymentQueryParams {
  appointmentId?: string;
  patientId?: string;
  doctorId?: string;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

export interface InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface InvoiceQueryParams {
  patientId?: string;
  doctorId?: string;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}

export interface DoctorPayoutResponseDto {
  id: string;
  publicPayoutId: string;
  doctorId: string;
  paymentId: string;
  appointmentId: string;
  grossAmount: string;
  platformFee: string;
  netAmount: string;
  currency: string;
  status: DoctorPayoutStatus;
  providerReference?: string | null;
  createdAt: string;
}

export interface PayoutQueryParams {
  doctorId?: string;
  status?: DoctorPayoutStatus;
  page?: number;
  limit?: number;
}

export interface RefundResponseDto {
  id: string;
  publicRefundId: string;
  appointmentId: string;
  paymentId?: string | null;
  amount: string;
  currency: string;
  reason: string;
  status: RefundStatus;
  idempotencyKey?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  failureReason?: string | null;
  providerReference?: string | null;
  createdAt: string;
}

export interface PaginatedRefundsResponseDto {
  data: RefundResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RefundQueryParams {
  appointmentId?: string;
  status?: RefundStatus;
  page?: number;
  limit?: number;
}
