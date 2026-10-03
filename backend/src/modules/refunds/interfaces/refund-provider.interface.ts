import type { RefundStatus } from '../enums/refund-status.enum.js';

export interface RefundExecutionRequest {
  refundId: string;
  publicRefundId: string;
  appointmentId: string;
  paymentId?: string | null;
  amount: number;
  currency: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface RefundExecutionResult {
  success: boolean;
  status: RefundStatus;
  providerReference?: string;
  failureReason?: string;
  processedAt: Date;
}

export interface IRefundProvider {
  executeRefund(request: RefundExecutionRequest): Promise<RefundExecutionResult>;
}

export const REFUND_PROVIDER = Symbol('REFUND_PROVIDER');
