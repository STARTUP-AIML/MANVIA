import type { AppointmentStatus } from '../enums/appointment-status.enum.js';
import type { SlotReservationState } from '../enums/slot-reservation-state.enum.js';

export interface AppointmentEntity {
  id: string;
  publicAppointmentId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  reservationState: SlotReservationState;
  reservedUntil: Date | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  declineReason: string | null;
  declinedAt: Date | null;
  confirmedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  noShowAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
