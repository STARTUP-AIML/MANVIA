import { Injectable, Optional } from '@nestjs/common';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import type { AppointmentActorRole } from './appointment-state-machine.service.js';

export enum RefundEligibility {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  NONE = 'NONE',
}

export interface CancellationPolicyOptions {
  fullRefundWindowHours?: number; // Default: 24 hours
  partialRefundWindowHours?: number; // Default: 2 hours
  partialRefundPercentage?: number; // Default: 0.50 (50%)
  policyVersion?: string; // Default: 'v1.0.0-phase14'
}

export interface CancellationPolicyEvaluationInput {
  appointmentStatus: AppointmentStatus;
  startAt: Date;
  feeAmount: number;
  actorRole: AppointmentActorRole;
  now?: Date;
}

export interface CancellationPolicyResult {
  allowed: boolean;
  refundEligibility: RefundEligibility;
  refundType: string;
  refundableAmount: number;
  cancellationFee: number;
  reason: string;
  policyVersion: string;
  actor: AppointmentActorRole;
  hoursUntilStart: number;
}

@Injectable()
export class CancellationPolicyService {
  private readonly fullRefundWindowHours: number;
  private readonly partialRefundWindowHours: number;
  private readonly partialRefundPercentage: number;
  private readonly policyVersion: string;

  constructor(@Optional() options?: CancellationPolicyOptions) {
    this.fullRefundWindowHours = options?.fullRefundWindowHours ?? 24;
    this.partialRefundWindowHours = options?.partialRefundWindowHours ?? 2;
    this.partialRefundPercentage = options?.partialRefundPercentage ?? 0.5;
    this.policyVersion = options?.policyVersion ?? 'v1.0.0-phase14';
  }

  /**
   * Evaluates cancellation and refund rules strictly per MANVIA specification (Billing.md):
   * 1. Doctor / System / Admin cancellation at any time: 100% refund to patient, 0 fee.
   * 2. Patient cancellation > 24 hours prior: 100% refund, zero penalty.
   * 3. Patient cancellation 2 - 24 hours prior: 50% refund, 50% cancellation fee.
   * 4. Patient cancellation < 2 hours or no-show: 0% refund, 100% cancellation fee.
   * 5. RESERVED / REQUESTED appointments (pre-charge): allowed, not charged / full relief.
   */
  public evaluate(input: CancellationPolicyEvaluationInput): CancellationPolicyResult {
    const now = input.now ?? new Date();
    const hoursUntilStart = (input.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Terminal or in-consultation statuses cannot be cancelled
    if (
      input.appointmentStatus === AppointmentStatus.COMPLETED ||
      input.appointmentStatus === AppointmentStatus.IN_PROGRESS ||
      input.appointmentStatus === AppointmentStatus.NO_SHOW ||
      input.appointmentStatus === AppointmentStatus.CANCELLED ||
      input.appointmentStatus === AppointmentStatus.DECLINED ||
      input.appointmentStatus === AppointmentStatus.EXPIRED
    ) {
      return {
        allowed: false,
        refundEligibility: RefundEligibility.NONE,
        refundType: 'NONE',
        refundableAmount: 0,
        cancellationFee: 0,
        reason: `Cancellation disallowed from status '${input.appointmentStatus}'.`,
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    }

    if (hoursUntilStart < 0 && input.actorRole === 'PATIENT') {
      return {
        allowed: false,
        refundEligibility: RefundEligibility.NONE,
        refundType: 'NONE',
        refundableAmount: 0,
        cancellationFee: 0,
        reason: 'Cannot cancel an appointment that has already started or elapsed.',
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    }

    const fee = Math.max(0, input.feeAmount);

    // If cancelled by DOCTOR, SYSTEM, or ADMIN: 100% refund, 0 cancellation fee
    if (
      input.actorRole === 'DOCTOR' ||
      input.actorRole === 'SYSTEM' ||
      input.actorRole === 'ADMIN'
    ) {
      return {
        allowed: true,
        refundEligibility: RefundEligibility.FULL,
        refundType: 'FULL_REFUND_PROVIDER_INITIATED',
        refundableAmount: fee,
        cancellationFee: 0,
        reason: `Cancellation initiated by ${input.actorRole}; patient entitled to 100% refund.`,
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    }

    // Patient cancellation evaluation
    // If appointment is not yet confirmed (RESERVED / REQUESTED)
    if (
      input.appointmentStatus === AppointmentStatus.RESERVED ||
      input.appointmentStatus === AppointmentStatus.REQUESTED
    ) {
      return {
        allowed: true,
        refundEligibility: RefundEligibility.FULL,
        refundType: 'FULL_REFUND_PRE_CONFIRMATION',
        refundableAmount: fee,
        cancellationFee: 0,
        reason: 'Cancellation prior to doctor confirmation; 100% refund applied.',
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    }

    // Confirmed appointment cancellation window check
    if (hoursUntilStart >= this.fullRefundWindowHours) {
      // > 24 hours
      return {
        allowed: true,
        refundEligibility: RefundEligibility.FULL,
        refundType: 'FULL_REFUND_ADVANCE_NOTICE',
        refundableAmount: fee,
        cancellationFee: 0,
        reason: `Cancelled ${hoursUntilStart.toFixed(1)}h prior (>= ${this.fullRefundWindowHours}h window); 100% refund.`,
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    } else if (hoursUntilStart >= this.partialRefundWindowHours) {
      // 2 - 24 hours
      const refundable = Math.round(fee * this.partialRefundPercentage * 100) / 100;
      const cancellationFee = Math.round((fee - refundable) * 100) / 100;

      return {
        allowed: true,
        refundEligibility: RefundEligibility.PARTIAL,
        refundType: 'PARTIAL_REFUND_STANDARD_WINDOW',
        refundableAmount: refundable,
        cancellationFee,
        reason: `Cancelled ${hoursUntilStart.toFixed(1)}h prior (${this.partialRefundWindowHours}h-${this.fullRefundWindowHours}h window); 50% refund applied.`,
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    } else {
      // < 2 hours
      return {
        allowed: true,
        refundEligibility: RefundEligibility.NONE,
        refundType: 'NON_REFUNDABLE_LATE_CANCELLATION',
        refundableAmount: 0,
        cancellationFee: fee,
        reason: `Late cancellation (${hoursUntilStart.toFixed(1)}h < ${this.partialRefundWindowHours}h threshold); non-refundable.`,
        policyVersion: this.policyVersion,
        actor: input.actorRole,
        hoursUntilStart,
      };
    }
  }
}
