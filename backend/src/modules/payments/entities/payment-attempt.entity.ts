import { PaymentAttemptStatus } from '../enums/payment-attempt-status.enum.js';

export interface PaymentAttemptProps {
  id: string;
  publicAttemptId: string;
  paymentId: string;
  attemptNumber: number;
  provider: string;
  providerAttemptId?: string | null;
  amount: string;
  currency: string;
  status: PaymentAttemptStatus;
  failureCode?: string | null;
  failureReason?: string | null;
  startedAt: Date;
  completedAt?: Date | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentAttemptEntity {
  public readonly id: string;
  public readonly publicAttemptId: string;
  public readonly paymentId: string;
  public readonly attemptNumber: number;
  public readonly provider: string;
  private _providerAttemptId?: string | null;
  public readonly amount: string;
  public readonly currency: string;
  private _status: PaymentAttemptStatus;
  private _failureCode?: string | null;
  private _failureReason?: string | null;
  public readonly startedAt: Date;
  private _completedAt?: Date | null;
  private _metadata?: Record<string, unknown> | null;
  public readonly createdAt: Date;
  private _updatedAt: Date;

  public constructor(props: PaymentAttemptProps) {
    this.id = props.id;
    this.publicAttemptId = props.publicAttemptId;
    this.paymentId = props.paymentId;
    this.attemptNumber = props.attemptNumber;
    this.provider = props.provider;
    this._providerAttemptId = props.providerAttemptId ?? null;
    this.amount = props.amount;
    this.currency = props.currency;
    this._status = props.status;
    this._failureCode = props.failureCode ?? null;
    this._failureReason = props.failureReason ?? null;
    this.startedAt = props.startedAt;
    this._completedAt = props.completedAt ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get status(): PaymentAttemptStatus {
    return this._status;
  }

  public get providerAttemptId(): string | null | undefined {
    return this._providerAttemptId;
  }

  public get failureCode(): string | null | undefined {
    return this._failureCode;
  }

  public get failureReason(): string | null | undefined {
    return this._failureReason;
  }

  public get completedAt(): Date | null | undefined {
    return this._completedAt;
  }

  public get metadata(): Record<string, unknown> | null | undefined {
    return this._metadata;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public markProcessing(providerAttemptId?: string): void {
    if (
      this._status === PaymentAttemptStatus.SUCCEEDED ||
      this._status === PaymentAttemptStatus.FAILED
    ) {
      throw new Error(`Cannot transition attempt from terminal state ${this._status}`);
    }
    this._status = PaymentAttemptStatus.PROCESSING;
    if (providerAttemptId) {
      this._providerAttemptId = providerAttemptId;
    }
    this._updatedAt = new Date();
  }

  public markSucceeded(providerAttemptId?: string, completedAt: Date = new Date()): void {
    if (this._status === PaymentAttemptStatus.SUCCEEDED) {
      return;
    }
    this._status = PaymentAttemptStatus.SUCCEEDED;
    if (providerAttemptId) {
      this._providerAttemptId = providerAttemptId;
    }
    this._completedAt = completedAt;
    this._failureCode = null;
    this._failureReason = null;
    this._updatedAt = new Date();
  }

  public markFailed(
    failureCode?: string,
    failureReason?: string,
    completedAt: Date = new Date(),
  ): void {
    if (this._status === PaymentAttemptStatus.SUCCEEDED) {
      throw new Error('Cannot fail an attempt that has already succeeded');
    }
    this._status = PaymentAttemptStatus.FAILED;
    this._failureCode = failureCode ?? null;
    this._failureReason = failureReason ?? null;
    this._completedAt = completedAt;
    this._updatedAt = new Date();
  }
}
