import type { AppointmentStatus } from '../enums/appointment-status.enum.js';

export interface BaseAppointmentEvent {
  appointmentId: string;
  publicAppointmentId: string;
  patientId: string;
  doctorId: string;
  consultationOfferId: string;
  startAt: string;
  endAt: string;
  occurredAt: string;
}

export interface AppointmentRequestedEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.REQUESTED;
  hasPreConsultation: boolean;
}

export interface AppointmentConfirmedEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.CONFIRMED;
  confirmedAt: string;
}

export interface AppointmentDeclinedEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.DECLINED;
  declineReason?: string | null;
  declinedAt: string;
}

export interface AppointmentCancelledEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.CANCELLED;
  cancelledBy: string;
  cancellationReason?: string | null;
  cancelledAt: string;
}

export interface AppointmentStartedEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.IN_PROGRESS;
  startedAt: string;
}

export interface AppointmentCompletedEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.COMPLETED;
  completedAt: string;
}

export interface AppointmentExpiredEvent extends BaseAppointmentEvent {
  status: AppointmentStatus.EXPIRED;
  expiredAt: string;
}
