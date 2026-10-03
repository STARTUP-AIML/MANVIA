import { Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '../enums/payment-status.enum.js';
import type { PaymentEntity } from '../entities/payment.entity.js';

export interface PayoutEligibilityContext {
  payment: PaymentEntity;
  appointmentStatus: string; // e.g. 'COMPLETED'
  hasPendingRefund?: boolean;
  doctorVerificationStatus?: string; // e.g. 'VERIFIED'
  disputeOnHold?: boolean;
}

export interface PayoutEligibilityResult {
  isEligible: boolean;
  reasons: string[];
}

@Injectable()
export class PayoutEligibilityService {
  private readonly logger = new Logger(PayoutEligibilityService.name);

  /**
   * Evaluates whether a doctor payout is eligible for scheduling/processing.
   */
  public evaluateEligibility(context: PayoutEligibilityContext): PayoutEligibilityResult {
    const reasons: string[] = [];

    // 1. Payment must be in SUCCEEDED status
    if (context.payment.status !== PaymentStatus.SUCCEEDED) {
      reasons.push(`Payment is not in SUCCEEDED state (current: ${context.payment.status})`);
    }

    // 2. Appointment must be completed
    if (context.appointmentStatus !== 'COMPLETED') {
      reasons.push(`Appointment has not been completed (current: ${context.appointmentStatus})`);
    }

    // 3. No pending or active refund request
    if (context.hasPendingRefund) {
      reasons.push('Appointment has an active or pending refund request');
    }

    // 4. No dispute or fraud hold
    if (context.disputeOnHold) {
      reasons.push('Payment or appointment is under dispute / financial hold');
    }

    // 5. Doctor must be verified on the platform
    if (context.doctorVerificationStatus && context.doctorVerificationStatus !== 'VERIFIED') {
      reasons.push(
        `Doctor platform status is not VERIFIED (current: ${context.doctorVerificationStatus})`,
      );
    }

    const isEligible = reasons.length === 0;

    if (!isEligible) {
      this.logger.debug(
        `Payout for payment ${context.payment.publicPaymentId} is not eligible: ${reasons.join(', ')}`,
      );
    }

    return {
      isEligible,
      reasons,
    };
  }
}
