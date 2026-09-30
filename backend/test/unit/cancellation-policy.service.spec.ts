import { describe, it, expect, beforeEach } from 'vitest';
import { CancellationPolicyService } from '../../src/modules/appointments/services/cancellation-policy.service.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';

describe('CancellationPolicyService (Unit Tests)', () => {
  let policyService: CancellationPolicyService;

  beforeEach(() => {
    policyService = new CancellationPolicyService();
  });

  describe('Patient Cancellation Policy', () => {
    it('should grant 100% refund when cancelled more than 24 hours prior', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-02T12:00:00.000Z'); // 26 hours in future
      const fee = 100;

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.CONFIRMED,
        startAt,
        feeAmount: fee,
        actorRole: 'PATIENT',
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe('FULL');
      expect(result.refundType).toBe('FULL_REFUND_ADVANCE_NOTICE');
      expect(result.refundableAmount).toBe(100);
      expect(result.cancellationFee).toBe(0);
      expect(result.hoursUntilStart).toBeGreaterThan(24);
    });

    it('should grant 50% refund when cancelled between 2 and 24 hours prior', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-01T16:00:00.000Z'); // 6 hours in future
      const fee = 120;

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.CONFIRMED,
        startAt,
        feeAmount: fee,
        actorRole: 'PATIENT',
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe('PARTIAL');
      expect(result.refundType).toBe('PARTIAL_REFUND_STANDARD_WINDOW');
      expect(result.refundableAmount).toBe(60);
      expect(result.cancellationFee).toBe(60);
      expect(result.hoursUntilStart).toBe(6);
    });

    it('should grant 0% refund (non-refundable) when cancelled less than 2 hours prior', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-01T11:00:00.000Z'); // 1 hour in future
      const fee = 150;

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.CONFIRMED,
        startAt,
        feeAmount: fee,
        actorRole: 'PATIENT',
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe('NONE');
      expect(result.refundType).toBe('NON_REFUNDABLE_LATE_CANCELLATION');
      expect(result.refundableAmount).toBe(0);
      expect(result.cancellationFee).toBe(150);
      expect(result.hoursUntilStart).toBe(1);
    });

    it('should grant 100% refund for unconfirmed (REQUESTED) appointment cancellation regardless of time', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-01T10:30:00.000Z'); // 30 mins away
      const fee = 80;

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.REQUESTED,
        startAt,
        feeAmount: fee,
        actorRole: 'PATIENT',
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe('FULL');
      expect(result.refundType).toBe('FULL_REFUND_PRE_CONFIRMATION');
      expect(result.refundableAmount).toBe(80);
      expect(result.cancellationFee).toBe(0);
    });

    it('should reject cancellation for completed or in-progress appointments', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-01T12:00:00.000Z');

      const completedResult = policyService.evaluate({
        appointmentStatus: AppointmentStatus.COMPLETED,
        startAt,
        feeAmount: 100,
        actorRole: 'PATIENT',
        now,
      });
      expect(completedResult.allowed).toBe(false);

      const inProgressResult = policyService.evaluate({
        appointmentStatus: AppointmentStatus.IN_PROGRESS,
        startAt,
        feeAmount: 100,
        actorRole: 'PATIENT',
        now,
      });
      expect(inProgressResult.allowed).toBe(false);
    });

    it('should reject cancellation if start time has already passed', () => {
      const now = new Date('2026-10-01T12:00:00.000Z');
      const startAt = new Date('2026-10-01T10:00:00.000Z'); // 2 hours in past

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.CONFIRMED,
        startAt,
        feeAmount: 100,
        actorRole: 'PATIENT',
        now,
      });

      expect(result.allowed).toBe(false);
      expect(result.refundEligibility).toBe('NONE');
      expect(result.refundableAmount).toBe(0);
    });
  });

  describe('Doctor Cancellation Policy', () => {
    it('should grant 100% patient refund regardless of time when doctor cancels', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-01T10:30:00.000Z'); // 30 minutes away
      const fee = 200;

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.CONFIRMED,
        startAt,
        feeAmount: fee,
        actorRole: 'DOCTOR',
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe('FULL');
      expect(result.refundType).toBe('FULL_REFUND_PROVIDER_INITIATED');
      expect(result.refundableAmount).toBe(200);
      expect(result.cancellationFee).toBe(0);
    });
  });

  describe('Admin Cancellation Policy', () => {
    it('should allow override and grant 100% refund when admin cancels', () => {
      const now = new Date('2026-10-01T10:00:00.000Z');
      const startAt = new Date('2026-10-01T10:15:00.000Z');
      const fee = 150;

      const result = policyService.evaluate({
        appointmentStatus: AppointmentStatus.CONFIRMED,
        startAt,
        feeAmount: fee,
        actorRole: 'ADMIN',
        now,
      });

      expect(result.allowed).toBe(true);
      expect(result.refundEligibility).toBe('FULL');
      expect(result.refundType).toBe('FULL_REFUND_PROVIDER_INITIATED');
      expect(result.refundableAmount).toBe(150);
      expect(result.cancellationFee).toBe(0);
    });
  });
});
