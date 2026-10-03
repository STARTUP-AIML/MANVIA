import type { AppointmentEntity } from '../entities/appointment.entity.js';
import type { PreConsultationEntity } from '../entities/pre-consultation.entity.js';
import type { AppointmentCancellationEntity } from '../entities/appointment-cancellation.entity.js';
import type { AppointmentStatus } from '../enums/appointment-status.enum.js';
import type { SlotReservationState } from '../enums/slot-reservation-state.enum.js';
import type { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';

export interface CreateAppointmentInput {
  publicAppointmentId?: string | undefined;
  patientId: string;
  doctorId: string;
  consultationOfferId: string;
  startAt: Date;
  endAt: Date;
  status?: AppointmentStatus | undefined;
  reservationState?: SlotReservationState | undefined;
  reservedUntil?: Date | null | undefined;
  notes?: string | null | undefined;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus | undefined;
  reservationState?: SlotReservationState | undefined;
  reservedUntil?: Date | null | undefined;
  cancellationReason?: string | null | undefined;
  cancelledAt?: Date | null | undefined;
  cancelledBy?: string | null | undefined;
  declineReason?: string | null | undefined;
  declinedAt?: Date | null | undefined;
  confirmedAt?: Date | null | undefined;
  startedAt?: Date | null | undefined;
  completedAt?: Date | null | undefined;
  noShowAt?: Date | null | undefined;
  notes?: string | null | undefined;
}

export interface AppointmentQueryOptions {
  patientId?: string | undefined;
  doctorId?: string | undefined;
  status?: AppointmentStatus | undefined;
  statuses?: AppointmentStatus[] | undefined;
  upcomingOnly?: boolean | undefined;
  pastOnly?: boolean | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface CreatePreConsultationInput {
  appointmentId: string;
  patientId: string;
  reasonForVisit: string;
  symptoms?: string | null | undefined;
  symptomOnset?: string | null | undefined;
  currentMedications?: string | null | undefined;
  allergies?: string | null | undefined;
  patientNotes?: string | null | undefined;
  status?: PreConsultationStatus | undefined;
  submittedAt?: Date | null | undefined;
}

export interface UpdatePreConsultationInput {
  reasonForVisit?: string | undefined;
  symptoms?: string | null | undefined;
  symptomOnset?: string | null | undefined;
  currentMedications?: string | null | undefined;
  allergies?: string | null | undefined;
  patientNotes?: string | null | undefined;
  status?: PreConsultationStatus | undefined;
  submittedAt?: Date | null | undefined;
}

export interface CreateCancellationInput {
  appointmentId: string;
  cancelledBy: string;
  cancellationActorType: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'SYSTEM';
  reason: string;
  reasonCode?: string | null | undefined;
  metadata?: string | null | undefined;
}

export interface IAppointmentRepository {
  createAppointment(input: CreateAppointmentInput): Promise<AppointmentEntity>;
  findAppointmentById(id: string): Promise<AppointmentEntity | null>;
  findAppointmentByPublicId(publicAppointmentId: string): Promise<AppointmentEntity | null>;
  findPatientAppointment(
    patientId: string,
    idOrPublicId: string,
  ): Promise<AppointmentEntity | null>;
  findDoctorAppointment(doctorId: string, idOrPublicId: string): Promise<AppointmentEntity | null>;
  findAppointments(
    options: AppointmentQueryOptions,
  ): Promise<{ data: AppointmentEntity[]; total: number }>;
  updateAppointment(id: string, input: UpdateAppointmentInput): Promise<AppointmentEntity>;
  findOverlappingActiveAppointment(
    doctorId: string,
    startAt: Date,
    endAt: Date,
    excludeAppointmentId?: string,
  ): Promise<AppointmentEntity | null>;

  createPreConsultation(input: CreatePreConsultationInput): Promise<PreConsultationEntity>;
  findPreConsultationByAppointmentId(appointmentId: string): Promise<PreConsultationEntity | null>;
  updatePreConsultation(
    id: string,
    input: UpdatePreConsultationInput,
  ): Promise<PreConsultationEntity>;

  createCancellation(input: CreateCancellationInput): Promise<AppointmentCancellationEntity>;
  findCancellationByAppointmentId(
    appointmentId: string,
  ): Promise<AppointmentCancellationEntity | null>;
}

export const APPOINTMENT_REPOSITORY = Symbol('APPOINTMENT_REPOSITORY');
