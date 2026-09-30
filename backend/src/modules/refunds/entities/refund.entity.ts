import type { RefundStatus } from '../enums/refund-status.enum.js';

export interface RefundEntity {
  id: string;
  publicRefundId: string;
  appointmentId: string;
  paymentId: string | null;
  amount: number;
  currency: string;
  reason: string;
  status: RefundStatus;
  idempotencyKey: string | null;
  requestedAt: Date;
  processedAt: Date | null;
  failureReason: string | null;
  providerReference: string | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}
