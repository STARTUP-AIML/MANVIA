import { PaymentStatus } from '../enums/payment-status.enum.js';
import type { PaymentAttemptEntity } from './payment-attempt.entity.js';

export interface PaymentProps {
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
  paidAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  attempts?: PaymentAttemptEntity[];
}

export class PaymentEntity {
  public readonly id: string;
  public readonly publicPaymentId: string;
  public readonly appointmentId: string;
  public readonly patientId: string;
  public readonly doctorId: string;
  public readonly consultationOfferId?: string | null;
  public readonly amount: string;
  public readonly currency: string;
  private _status: PaymentStatus;
  public readonly provider: string;
  private _providerPaymentId?: string | null;
  public readonly idempotencyKey?: string | null;
  private _paidAt?: Date | null;
  private _failedAt?: Date | null;
  private _cancelledAt?: Date | null;
  private _failureReason?: string | null;
  private _metadata?: Record<string, unknown> | null;
  public readonly createdAt: Date;
  private _updatedAt: Date;
  private _attempts: PaymentAttemptEntity[];

  public constructor(props: PaymentProps) {
    this.id = props.id;
    this.publicPaymentId = props.publicPaymentId;
    this.appointmentId = props.appointmentId;
    this.patientId = props.patientId;
    this.doctorId = props.doctorId;
    this.consultationOfferId = props.consultationOfferId ?? null;
    this.amount = props.amount;
    this.currency = props.currency;
    this._status = props.status;
    this.provider = props.provider;
    this._providerPaymentId = props.providerPaymentId ?? null;
    this.idempotencyKey = props.idempotencyKey ?? null;
    this._paidAt = props.paidAt ?? null;
    this._failedAt = props.failedAt ?? null;
    this._cancelledAt = props.cancelledAt ?? null;
    this._failureReason = props.failureReason ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
    this._attempts = props.attempts ?? [];
  }

  public get status(): PaymentStatus {
    return this._status;
  }

  public get providerPaymentId(): string | null | undefined {
    return this._providerPaymentId;
  }

  public get paidAt(): Date | null | undefined {
    return this._paidAt;
  }

  public get failedAt(): Date | null | undefined {
    return this._failedAt;
  }

  public get cancelledAt(): Date | null | undefined {
    return this._cancelledAt;
  }

  public get failureReason(): string | null | undefined {
    return this._failureReason;
  }

  public get metadata(): Record<string, unknown> | null | undefined {
    return this._metadata;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public get attempts(): PaymentAttemptEntity[] {
    return [...this._attempts];
  }

  public addAttempt(attempt: PaymentAttemptEntity): void {
    this._attempts.push(attempt);
    this._updatedAt = new Date();
  }

  public setProviderPaymentId(id: string): void {
    this._providerPaymentId = id;
    this._updatedAt = new Date();
  }

  /**
   * Validates state machine transition.
   */
  public canTransitionTo(nextStatus: PaymentStatus): boolean {
    if (this._status === nextStatus) {
      return true;
    }

    // Terminal states cannot be changed
    if (this._status === PaymentStatus.SUCCEEDED) {
      return false; // Successful payment cannot be mutated into failed/cancelled/expired
    }

    if (this._status === PaymentStatus.CANCELLED) {
      return false;
    }

    if (this._status === PaymentStatus.EXPIRED) {
      return false;
    }

    switch (this._status) {
      case PaymentStatus.CREATED:
        return [
          PaymentStatus.PENDING,
          PaymentStatus.PROCESSING,
          PaymentStatus.CANCELLED,
          PaymentStatus.EXPIRED,
        ].includes(nextStatus);

      case PaymentStatus.PENDING:
        return [
          PaymentStatus.PROCESSING,
          PaymentStatus.SUCCEEDED,
          PaymentStatus.FAILED,
          PaymentStatus.CANCELLED,
          PaymentStatus.EXPIRED,
        ].includes(nextStatus);

      case PaymentStatus.PROCESSING:
        return [
          PaymentStatus.SUCCEEDED,
          PaymentStatus.FAILED,
          PaymentStatus.CANCELLED,
          PaymentStatus.EXPIRED,
        ].includes(nextStatus);

      case PaymentStatus.FAILED:
        // A failed payment can transition to PROCESSING if a new attempt is initiated
        return [PaymentStatus.PROCESSING, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED].includes(
          nextStatus,
        );

      default:
        return false;
    }
  }

  public markPending(providerPaymentId?: string): void {
    this.transitionTo(PaymentStatus.PENDING);
    if (providerPaymentId) {
      this._providerPaymentId = providerPaymentId;
    }
  }

  public markProcessing(providerPaymentId?: string): void {
    this.transitionTo(PaymentStatus.PROCESSING);
    if (providerPaymentId) {
      this._providerPaymentId = providerPaymentId;
    }
  }

  public markSucceeded(providerPaymentId?: string, paidAt: Date = new Date()): void {
    this.transitionTo(PaymentStatus.SUCCEEDED);
    if (providerPaymentId) {
      this._providerPaymentId = providerPaymentId;
    }
    this._paidAt = paidAt;
    this._failureReason = null;
    this._failedAt = null;
  }

  public markFailed(reason: string, failedAt: Date = new Date()): void {
    this.transitionTo(PaymentStatus.FAILED);
    this._failureReason = reason;
    this._failedAt = failedAt;
  }

  public markCancelled(reason?: string, cancelledAt: Date = new Date()): void {
    this.transitionTo(PaymentStatus.CANCELLED);
    if (reason) {
      this._failureReason = reason;
    }
    this._cancelledAt = cancelledAt;
  }

  public markExpired(expiredAt: Date = new Date()): void {
    this.transitionTo(PaymentStatus.EXPIRED);
    this._failureReason = 'Payment expired';
    this._cancelledAt = expiredAt;
  }

  private transitionTo(nextStatus: PaymentStatus): void {
    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(
        `Invalid payment state transition from ${this._status} to ${nextStatus} for payment ${this.publicPaymentId}`,
      );
    }
    this._status = nextStatus;
    this._updatedAt = new Date();
  }
}
