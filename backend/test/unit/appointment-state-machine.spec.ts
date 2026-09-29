import { describe, it, expect, beforeEach } from 'vitest';
import { AppointmentStateMachineService } from '../../src/modules/appointments/services/appointment-state-machine.service.js';
import { AppointmentStatus } from '../../src/modules/appointments/enums/appointment-status.enum.js';
import { SlotReservationState } from '../../src/modules/appointments/enums/slot-reservation-state.enum.js';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('AppointmentStateMachineService (Unit Tests)', () => {
  let stateMachine: AppointmentStateMachineService;

  beforeEach(() => {
    stateMachine = new AppointmentStateMachineService();
  });

  describe('Valid Lifecycle Transitions', () => {
    it('allows RESERVED -> REQUESTED for PATIENT and SYSTEM', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.RESERVED,
          AppointmentStatus.REQUESTED,
          'PATIENT',
        ),
      ).not.toThrow();

      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.RESERVED,
          AppointmentStatus.REQUESTED,
          'SYSTEM',
        ),
      ).not.toThrow();
    });

    it('allows RESERVED -> CANCELLED for PATIENT and SYSTEM', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.RESERVED,
          AppointmentStatus.CANCELLED,
          'PATIENT',
        ),
      ).not.toThrow();

      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.RESERVED,
          AppointmentStatus.CANCELLED,
          'SYSTEM',
        ),
      ).not.toThrow();
    });

    it('allows RESERVED -> EXPIRED for SYSTEM', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.RESERVED,
          AppointmentStatus.EXPIRED,
          'SYSTEM',
        ),
      ).not.toThrow();
    });

    it('allows REQUESTED -> CONFIRMED for DOCTOR', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.CONFIRMED,
          'DOCTOR',
        ),
      ).not.toThrow();
    });

    it('allows REQUESTED -> DECLINED for DOCTOR', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.DECLINED,
          'DOCTOR',
        ),
      ).not.toThrow();
    });

    it('allows REQUESTED -> CANCELLED for PATIENT and DOCTOR', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.CANCELLED,
          'PATIENT',
        ),
      ).not.toThrow();

      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.CANCELLED,
          'DOCTOR',
        ),
      ).not.toThrow();
    });

    it('allows CONFIRMED -> IN_PROGRESS for DOCTOR', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.IN_PROGRESS,
          'DOCTOR',
        ),
      ).not.toThrow();
    });

    it('allows CONFIRMED -> CANCELLED for PATIENT and DOCTOR', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CANCELLED,
          'PATIENT',
        ),
      ).not.toThrow();

      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CANCELLED,
          'DOCTOR',
        ),
      ).not.toThrow();
    });

    it('allows CONFIRMED -> NO_SHOW for DOCTOR and SYSTEM', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.NO_SHOW,
          'DOCTOR',
        ),
      ).not.toThrow();

      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.NO_SHOW,
          'SYSTEM',
        ),
      ).not.toThrow();
    });

    it('allows IN_PROGRESS -> COMPLETED for DOCTOR', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.IN_PROGRESS,
          AppointmentStatus.COMPLETED,
          'DOCTOR',
        ),
      ).not.toThrow();
    });

    it('treats identical status transition as a no-op', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CONFIRMED,
          'DOCTOR',
        ),
      ).not.toThrow();
    });
  });

  describe('Forbidden & Invalid Transitions', () => {
    it('rejects PATIENT attempting to CONFIRM an appointment', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.CONFIRMED,
          'PATIENT',
        ),
      ).toThrow(ForbiddenError);
    });

    it('rejects PATIENT attempting to START an appointment', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.IN_PROGRESS,
          'PATIENT',
        ),
      ).toThrow(ForbiddenError);
    });

    it('rejects PATIENT attempting to DECLINE an appointment', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.DECLINED,
          'PATIENT',
        ),
      ).toThrow(ForbiddenError);
    });

    it('rejects illegal jump from REQUESTED directly to COMPLETED', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.REQUESTED,
          AppointmentStatus.COMPLETED,
          'DOCTOR',
        ),
      ).toThrow(ValidationError);
    });

    it('rejects transition from terminal CANCELLED status', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.CANCELLED,
          AppointmentStatus.CONFIRMED,
          'DOCTOR',
        ),
      ).toThrow(ConflictError);
    });

    it('rejects transition from terminal DECLINED status', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.DECLINED,
          AppointmentStatus.CONFIRMED,
          'DOCTOR',
        ),
      ).toThrow(ConflictError);
    });

    it('rejects transition from terminal COMPLETED status', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.COMPLETED,
          AppointmentStatus.IN_PROGRESS,
          'DOCTOR',
        ),
      ).toThrow(ConflictError);
    });

    it('rejects transition from terminal EXPIRED status', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.EXPIRED,
          AppointmentStatus.REQUESTED,
          'PATIENT',
        ),
      ).toThrow(ConflictError);
    });

    it('rejects transition from terminal NO_SHOW status', () => {
      expect(() =>
        stateMachine.validateTransition(
          AppointmentStatus.NO_SHOW,
          AppointmentStatus.IN_PROGRESS,
          'DOCTOR',
        ),
      ).toThrow(ConflictError);
    });
  });

  describe('Reservation State Mapping', () => {
    it('maps RESERVED to HELD_IN_RESERVATION', () => {
      expect(stateMachine.resolveReservationState(AppointmentStatus.RESERVED)).toBe(
        SlotReservationState.HELD_IN_RESERVATION,
      );
    });

    it('maps CANCELLED, DECLINED, EXPIRED to AVAILABLE', () => {
      expect(stateMachine.resolveReservationState(AppointmentStatus.CANCELLED)).toBe(
        SlotReservationState.AVAILABLE,
      );
      expect(stateMachine.resolveReservationState(AppointmentStatus.DECLINED)).toBe(
        SlotReservationState.AVAILABLE,
      );
      expect(stateMachine.resolveReservationState(AppointmentStatus.EXPIRED)).toBe(
        SlotReservationState.AVAILABLE,
      );
    });

    it('maps REQUESTED, CONFIRMED, IN_PROGRESS, COMPLETED, NO_SHOW to BOOKED', () => {
      expect(stateMachine.resolveReservationState(AppointmentStatus.REQUESTED)).toBe(
        SlotReservationState.BOOKED,
      );
      expect(stateMachine.resolveReservationState(AppointmentStatus.CONFIRMED)).toBe(
        SlotReservationState.BOOKED,
      );
      expect(stateMachine.resolveReservationState(AppointmentStatus.IN_PROGRESS)).toBe(
        SlotReservationState.BOOKED,
      );
      expect(stateMachine.resolveReservationState(AppointmentStatus.COMPLETED)).toBe(
        SlotReservationState.BOOKED,
      );
      expect(stateMachine.resolveReservationState(AppointmentStatus.NO_SHOW)).toBe(
        SlotReservationState.BOOKED,
      );
    });
  });

  describe('isSlotBlockingStatus', () => {
    it('returns true for active blocking statuses', () => {
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.RESERVED)).toBe(true);
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.REQUESTED)).toBe(true);
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.CONFIRMED)).toBe(true);
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.IN_PROGRESS)).toBe(true);
    });

    it('returns false for released terminal statuses', () => {
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.CANCELLED)).toBe(false);
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.DECLINED)).toBe(false);
      expect(stateMachine.isSlotBlockingStatus(AppointmentStatus.EXPIRED)).toBe(false);
    });
  });
});
