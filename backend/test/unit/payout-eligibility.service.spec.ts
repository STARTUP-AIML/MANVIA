import { describe, it, expect, beforeEach } from 'vitest';
import { PayoutEligibilityService } from '../../src/modules/payments/services/payout-eligibility.service.js';
import { PaymentEntity } from '../../src/modules/payments/entities/payment.entity.js';
import { PaymentStatus } from '../../src/modules/payments/enums/payment-status.enum.js';

describe('PayoutEligibilityService (Unit Tests)', () => {
  let service: PayoutEligibilityService;

  beforeEach(() => {
    service = new PayoutEligibilityService();
  });

  const createPayment = (status: PaymentStatus) =>
    new PaymentEntity({
      id: 'pay-1',
      publicPaymentId: 'PAY-1',
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      doctorId: 'doc-1',
      amount: '100.00',
      currency: 'USD',
      status,
      provider: 'simulated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('should approve payout when all criteria are satisfied', () => {
    const result = service.evaluateEligibility({
      payment: createPayment(PaymentStatus.SUCCEEDED),
      appointmentStatus: 'COMPLETED',
      hasPendingRefund: false,
      doctorVerificationStatus: 'VERIFIED',
      disputeOnHold: false,
    });

    expect(result.isEligible).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('should reject when payment is not in SUCCEEDED status', () => {
    const result = service.evaluateEligibility({
      payment: createPayment(PaymentStatus.PENDING),
      appointmentStatus: 'COMPLETED',
    });

    expect(result.isEligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('SUCCEEDED state'))).toBe(true);
  });

  it('should reject when appointment is not COMPLETED', () => {
    const result = service.evaluateEligibility({
      payment: createPayment(PaymentStatus.SUCCEEDED),
      appointmentStatus: 'REQUESTED',
    });

    expect(result.isEligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('not been completed'))).toBe(true);
  });

  it('should reject when refund is pending', () => {
    const result = service.evaluateEligibility({
      payment: createPayment(PaymentStatus.SUCCEEDED),
      appointmentStatus: 'COMPLETED',
      hasPendingRefund: true,
    });

    expect(result.isEligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('active or pending refund'))).toBe(true);
  });

  it('should reject when dispute hold is active', () => {
    const result = service.evaluateEligibility({
      payment: createPayment(PaymentStatus.SUCCEEDED),
      appointmentStatus: 'COMPLETED',
      disputeOnHold: true,
    });

    expect(result.isEligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('financial hold'))).toBe(true);
  });

  it('should reject when doctor is unverified', () => {
    const result = service.evaluateEligibility({
      payment: createPayment(PaymentStatus.SUCCEEDED),
      appointmentStatus: 'COMPLETED',
      doctorVerificationStatus: 'SUSPENDED',
    });

    expect(result.isEligible).toBe(false);
    expect(result.reasons.some((r) => r.includes('VERIFIED'))).toBe(true);
  });
});
