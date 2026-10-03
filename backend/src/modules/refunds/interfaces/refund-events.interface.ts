import type { RefundStatus } from '../enums/refund-status.enum.js';

export interface RefundRequestedEvent {
  refundId: string;
  publicRefundId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus.REQUESTED;
  occurredAt: string;
}

export interface RefundProcessedEvent {
  refundId: string;
  publicRefundId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: RefundStatus.SUCCEEDED;
  providerReference: string;
  occurredAt: string;
}

export interface RefundFailedEvent {
  refundId: string;
  publicRefundId: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: RefundStatus.FAILED;
  failureReason: string;
  occurredAt: string;
}
