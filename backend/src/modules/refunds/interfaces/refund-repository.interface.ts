import type { RefundEntity } from '../entities/refund.entity.js';
import type { RefundStatus } from '../enums/refund-status.enum.js';

export interface CreateRefundParams {
  publicRefundId: string;
  appointmentId: string;
  paymentId?: string | null;
  amount: number;
  currency: string;
  reason: string;
  status?: RefundStatus;
  idempotencyKey?: string | null;
  metadata?: string | null;
}

export interface UpdateRefundParams {
  status?: RefundStatus;
  processedAt?: Date | null;
  failureReason?: string | null;
  providerReference?: string | null;
  metadata?: string | null;
}

export interface FindRefundsParams {
  appointmentId?: string | undefined;
  status?: RefundStatus | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface IRefundRepository {
  createRefund(params: CreateRefundParams): Promise<RefundEntity>;
  findById(id: string): Promise<RefundEntity | null>;
  findByPublicId(publicId: string): Promise<RefundEntity | null>;
  findByAppointmentId(appointmentId: string): Promise<RefundEntity[]>;
  findByIdempotencyKey(key: string): Promise<RefundEntity | null>;
  updateRefund(id: string, params: UpdateRefundParams): Promise<RefundEntity>;
  findRefunds(params: FindRefundsParams): Promise<{ data: RefundEntity[]; total: number }>;
}

export const REFUND_REPOSITORY = Symbol('REFUND_REPOSITORY');
