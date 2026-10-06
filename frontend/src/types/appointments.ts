/**
 * Phase 7: Appointments, Booking & Slot Reservation Types
 * Derived strictly from backend DTOs and Enums in:
 * - backend/src/modules/appointments/enums/appointment-status.enum.ts
 * - backend/src/modules/appointments/enums/slot-reservation-state.enum.ts
 * - backend/src/modules/appointments/dto/create-appointment.dto.ts
 * - backend/src/modules/appointments/dto/reserve-slot.dto.ts
 * - backend/src/modules/appointments/dto/appointment-response.dto.ts
 */

export type AppointmentStatus =
  | 'RESERVED'
  | 'REQUESTED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'NO_SHOW';

export type SlotReservationState = 'AVAILABLE' | 'HELD_IN_RESERVATION' | 'BOOKED';

export type PreConsultationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'EXPIRED';

export interface PreConsultationDraftDto {
  reasonForVisit: string; // Max 1000 chars, required
  symptoms?: string; // Max 2000 chars, optional
  symptomOnset?: string; // Max 100 chars, optional
  currentMedications?: string; // Max 2000 chars, optional
  allergies?: string; // Max 1000 chars, optional
  patientNotes?: string; // Max 2000 chars, optional
}

export interface PreConsultationResponseDto {
  id: string;
  appointmentId: string;
  publicAppointmentId?: string;
  patientId: string;
  status: PreConsultationStatus;
  reasonForVisit: string;
  symptoms?: string | null;
  symptomOnset?: string | null;
  currentMedications?: string | null;
  allergies?: string | null;
  patientNotes?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CancelAppointmentDto {
  reason: string; // Min 3, max 500 chars
  reasonCode?: string;
  requestRefund?: boolean;
}

export interface CreateAppointmentDto {
  doctorId: string; // Target doctor UUID or public identifier (DOC-XXXXXXXX)
  consultationOfferId: string; // ID of selected ConsultationOffer
  startAt: string; // ISO 8601 string (e.g. 2026-10-05T14:00:00.000Z)
  notes?: string; // Optional patient notes (max 500 chars)
  preConsultation?: PreConsultationDraftDto;
}

export interface ReserveSlotDto {
  doctorId: string;
  consultationOfferId: string;
  startAt: string; // ISO 8601 string
  holdDurationMinutes?: number; // 5-30, default 15
}

export interface AppointmentResponseDto {
  id: string;
  publicAppointmentId: string;
  patientId: string;
  publicPatientId?: string;
  doctorId: string;
  publicDoctorId?: string;
  doctorDisplayName?: string;
  consultationOfferId: string;
  offerTitle?: string;
  durationMinutes?: number;
  fee?: number;
  currency?: string;
  startAt: string; // ISO 8601 string
  endAt: string; // ISO 8601 string
  status: AppointmentStatus;
  reservationState: SlotReservationState;
  reservedUntil?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  declineReason?: string | null;
  declinedAt?: string | null;
  confirmedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  noShowAt?: string | null;
  notes?: string | null;
  hasPreConsultation?: boolean;
  preConsultationStatus?: PreConsultationStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAppointmentsResponseDto {
  data: AppointmentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AppointmentQueryParams {
  status?: AppointmentStatus;
  timeFilter?: 'UPCOMING' | 'PAST' | 'ALL';
  upcoming?: boolean;
  past?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Computed time slot for patient selection
 */
export interface CalculatedTimeSlot {
  startAt: string; // ISO 8601 string in UTC
  endAt: string; // ISO 8601 string in UTC
  displayTime: string; // e.g., "10:00 AM" or "14:00"
  displayEndTime: string;
  status: SlotReservationState;
  isBookable: boolean;
}
