import { Injectable } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { SlotReservationState } from '../enums/slot-reservation-state.enum.js';

export type AppointmentActorRole = 'PATIENT' | 'DOCTOR' | 'SYSTEM' | 'ADMIN';

interface TransitionRule {
  allowedRoles: AppointmentActorRole[];
  description: string;
}

const TERMINAL_STATUSES = new Set<AppointmentStatus>([
  AppointmentStatus.CANCELLED,
  AppointmentStatus.DECLINED,
  AppointmentStatus.EXPIRED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
]);

const ALLOWED_TRANSITIONS: Record<
  AppointmentStatus,
  Partial<Record<AppointmentStatus, TransitionRule>>
> = {
  [AppointmentStatus.RESERVED]: {
    [AppointmentStatus.REQUESTED]: {
      allowedRoles: ['PATIENT', 'SYSTEM'],
      description: 'Patient confirms slot reservation into appointment request',
    },
    [AppointmentStatus.CANCELLED]: {
      allowedRoles: ['PATIENT', 'SYSTEM', 'ADMIN'],
      description: 'Patient or system releases slot reservation',
    },
    [AppointmentStatus.EXPIRED]: {
      allowedRoles: ['SYSTEM'],
      description: 'Slot hold expires automatically without confirmation',
    },
  },
  [AppointmentStatus.REQUESTED]: {
    [AppointmentStatus.CONFIRMED]: {
      allowedRoles: ['DOCTOR'],
      description: 'Doctor accepts and confirms appointment request',
    },
    [AppointmentStatus.DECLINED]: {
      allowedRoles: ['DOCTOR'],
      description: 'Doctor declines appointment request',
    },
    [AppointmentStatus.CANCELLED]: {
      allowedRoles: ['PATIENT', 'DOCTOR', 'SYSTEM', 'ADMIN'],
      description: 'Appointment cancelled prior to confirmation',
    },
    [AppointmentStatus.EXPIRED]: {
      allowedRoles: ['SYSTEM'],
      description: 'Request window expires without doctor response',
    },
  },
  [AppointmentStatus.CONFIRMED]: {
    [AppointmentStatus.IN_PROGRESS]: {
      allowedRoles: ['DOCTOR'],
      description: 'Doctor starts consultation session',
    },
    [AppointmentStatus.CANCELLED]: {
      allowedRoles: ['PATIENT', 'DOCTOR', 'ADMIN'],
      description: 'Confirmed appointment cancelled according to policy',
    },
    [AppointmentStatus.NO_SHOW]: {
      allowedRoles: ['DOCTOR', 'SYSTEM', 'ADMIN'],
      description: 'Patient failed to appear for consultation',
    },
  },
  [AppointmentStatus.IN_PROGRESS]: {
    [AppointmentStatus.COMPLETED]: {
      allowedRoles: ['DOCTOR'],
      description: 'Doctor concludes consultation session',
    },
  },
  [AppointmentStatus.COMPLETED]: {},
  [AppointmentStatus.CANCELLED]: {},
  [AppointmentStatus.DECLINED]: {},
  [AppointmentStatus.EXPIRED]: {},
  [AppointmentStatus.NO_SHOW]: {},
};

@Injectable()
export class AppointmentStateMachineService {
  /**
   * Validates state transition and actor permission. Throws on illegal transition.
   */
  public validateTransition(
    currentStatus: AppointmentStatus,
    targetStatus: AppointmentStatus,
    actorRole: AppointmentActorRole,
  ): void {
    if (currentStatus === targetStatus) {
      return; // No-op idempotent transition
    }

    if (TERMINAL_STATUSES.has(currentStatus)) {
      throw new ConflictError(
        `Cannot transition appointment from terminal status '${currentStatus}' to '${targetStatus}'.`,
      );
    }

    const availableTransitions = ALLOWED_TRANSITIONS[currentStatus];
    const rule = availableTransitions?.[targetStatus];

    if (!rule) {
      throw new ValidationError(
        `Invalid appointment state transition from '${currentStatus}' to '${targetStatus}'.`,
      );
    }

    if (!rule.allowedRoles.includes(actorRole)) {
      throw new ForbiddenError(
        `Role '${actorRole}' is not authorized to transition appointment from '${currentStatus}' to '${targetStatus}'.`,
      );
    }
  }

  /**
   * Maps appointment status to corresponding availability slot reservation state.
   */
  public resolveReservationState(status: AppointmentStatus): SlotReservationState {
    switch (status) {
      case AppointmentStatus.RESERVED:
        return SlotReservationState.HELD_IN_RESERVATION;
      case AppointmentStatus.CANCELLED:
      case AppointmentStatus.DECLINED:
      case AppointmentStatus.EXPIRED:
        return SlotReservationState.AVAILABLE;
      case AppointmentStatus.REQUESTED:
      case AppointmentStatus.CONFIRMED:
      case AppointmentStatus.IN_PROGRESS:
      case AppointmentStatus.COMPLETED:
      case AppointmentStatus.NO_SHOW:
      default:
        return SlotReservationState.BOOKED;
    }
  }

  /**
   * Checks whether a status is active and blocks the slot from being booked.
   */
  public isSlotBlockingStatus(status: AppointmentStatus): boolean {
    return (
      status === AppointmentStatus.RESERVED ||
      status === AppointmentStatus.REQUESTED ||
      status === AppointmentStatus.CONFIRMED ||
      status === AppointmentStatus.IN_PROGRESS ||
      status === AppointmentStatus.COMPLETED ||
      status === AppointmentStatus.NO_SHOW
    );
  }
}
