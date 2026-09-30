import { DoctorPayoutStatus } from '../enums/doctor-payout-status.enum.js';

export interface DoctorPayoutProps {
  id: string;
  publicPayoutId: string;
  doctorId: string;
  appointmentId: string;
  paymentId: string;
  grossAmount: string;
  platformFee: string;
  taxWithheld: string;
  providerFee: string;
  netAmount: string;
  currency: string;
  status: DoctorPayoutStatus;
  provider?: string | null;
  providerPayoutId?: string | null;
  idempotencyKey?: string | null;
  eligibleAt?: Date | null;
  scheduledAt?: Date | null;
  processedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  failureReason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DoctorPayoutEntity {
  public readonly id: string;
  public readonly publicPayoutId: string;
  public readonly doctorId: string;
  public readonly appointmentId: string;
  public readonly paymentId: string;
  public readonly grossAmount: string;
  public readonly platformFee: string;
  public readonly taxWithheld: string;
  public readonly providerFee: string;
  public readonly netAmount: string;
  public readonly currency: string;
  private _status: DoctorPayoutStatus;
  private _provider?: string | null;
  private _providerPayoutId?: string | null;
  public readonly idempotencyKey?: string | null;
  private _eligibleAt?: Date | null;
  private _scheduledAt?: Date | null;
  private _processedAt?: Date | null;
  private _failedAt?: Date | null;
  private _cancelledAt?: Date | null;
  private _failureReason?: string | null;
  private _metadata?: Record<string, unknown> | null;
  public readonly createdAt: Date;
  private _updatedAt: Date;

  public constructor(props: DoctorPayoutProps) {
    this.id = props.id;
    this.publicPayoutId = props.publicPayoutId;
    this.doctorId = props.doctorId;
    this.appointmentId = props.appointmentId;
    this.paymentId = props.paymentId;
    this.grossAmount = props.grossAmount;
    this.platformFee = props.platformFee;
    this.taxWithheld = props.taxWithheld;
    this.providerFee = props.providerFee;
    this.netAmount = props.netAmount;
    this.currency = props.currency;
    this._status = props.status;
    this._provider = props.provider ?? null;
    this._providerPayoutId = props.providerPayoutId ?? null;
    this.idempotencyKey = props.idempotencyKey ?? null;
    this._eligibleAt = props.eligibleAt ?? null;
    this._scheduledAt = props.scheduledAt ?? null;
    this._processedAt = props.processedAt ?? null;
    this._failedAt = props.failedAt ?? null;
    this._cancelledAt = props.cancelledAt ?? null;
    this._failureReason = props.failureReason ?? null;
    this._metadata = props.metadata ?? null;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  public get status(): DoctorPayoutStatus {
    return this._status;
  }

  public get provider(): string | null | undefined {
    return this._provider;
  }

  public get providerPayoutId(): string | null | undefined {
    return this._providerPayoutId;
  }

  public get eligibleAt(): Date | null | undefined {
    return this._eligibleAt;
  }

  public get scheduledAt(): Date | null | undefined {
    return this._scheduledAt;
  }

  public get processedAt(): Date | null | undefined {
    return this._processedAt;
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

  public markEligible(eligibleAt: Date = new Date()): void {
    if (this._status !== DoctorPayoutStatus.PENDING) {
      throw new Error(`Cannot mark payout eligible from status ${this._status}`);
    }
    this._status = DoctorPayoutStatus.ELIGIBLE;
    this._eligibleAt = eligibleAt;
    this._updatedAt = new Date();
  }

  public markProcessing(
    provider: string,
    providerPayoutId?: string,
    scheduledAt: Date = new Date(),
  ): void {
    if (
      this._status !== DoctorPayoutStatus.ELIGIBLE &&
      this._status !== DoctorPayoutStatus.PENDING
    ) {
      throw new Error(`Cannot process payout from status ${this._status}`);
    }
    this._status = DoctorPayoutStatus.PROCESSING;
    this._provider = provider;
    if (providerPayoutId) {
      this._providerPayoutId = providerPayoutId;
    }
    this._scheduledAt = scheduledAt;
    this._updatedAt = new Date();
  }

  public markPaid(providerPayoutId?: string, processedAt: Date = new Date()): void {
    if (this._status === DoctorPayoutStatus.PAID) {
      return;
    }
    this._status = DoctorPayoutStatus.PAID;
    if (providerPayoutId) {
      this._providerPayoutId = providerPayoutId;
    }
    this._processedAt = processedAt;
    this._failureReason = null;
    this._failedAt = null;
    this._updatedAt = new Date();
  }

  public markFailed(reason: string, failedAt: Date = new Date()): void {
    if (this._status === DoctorPayoutStatus.PAID) {
      throw new Error('Cannot fail a payout that has already been paid');
    }
    this._status = DoctorPayoutStatus.FAILED;
    this._failureReason = reason;
    this._failedAt = failedAt;
    this._updatedAt = new Date();
  }

  public markCancelled(reason?: string, cancelledAt: Date = new Date()): void {
    if (this._status === DoctorPayoutStatus.PAID) {
      throw new Error('Cannot cancel a payout that has already been paid');
    }
    this._status = DoctorPayoutStatus.CANCELLED;
    if (reason) {
      this._failureReason = reason;
    }
    this._cancelledAt = cancelledAt;
    this._updatedAt = new Date();
  }
}
