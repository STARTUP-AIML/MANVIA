/**
 * Phase 7: Appointments API Client
 * Derived strictly from backend controllers:
 * - PatientAppointmentsController (backend/src/modules/appointments/controllers/patient-appointments.controller.ts)
 */

import { apiFetch } from './client';
import type {
  CreateAppointmentDto,
  ReserveSlotDto,
  AppointmentResponseDto,
  PaginatedAppointmentsResponseDto,
  AppointmentQueryParams,
  PreConsultationDraftDto,
  PreConsultationResponseDto,
} from '@/types/';

/**
 * Creates/requests an appointment with a verified doctor.
 * POST /api/v1/appointments
 */
export async function createAppointmentApi(
  dto: CreateAppointmentDto
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>('/appointments', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Temporarily reserves an appointment slot hold.
 * POST /api/v1/appointments/reserve
 */
export async function reserveSlotApi(
  dto: ReserveSlotDto
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>('/appointments/reserve', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Retrieves paginated appointments for the authenticated patient.
 * GET /api/v1/appointments
 */
export async function getPatientAppointmentsApi(
  params?: AppointmentQueryParams
): Promise<PaginatedAppointmentsResponseDto> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.timeFilter) {
    query.set('timeFilter', params.timeFilter);
  }
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }

  const qs = query.toString();
  const endpoint = qs ? `/appointments?${qs}` : '/appointments';
  return apiFetch<PaginatedAppointmentsResponseDto>(endpoint);
}

/**
 * Retrieves details for a specific appointment.
 * GET /api/v1/appointments/:appointmentId
 */
export async function getAppointmentByIdApi(
  appointmentId: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/appointments/${encodeURIComponent(appointmentId)}`
  );
}

/**
 * Cancels an appointment as a patient.
 * POST /api/v1/appointments/:appointmentId/cancel
 */
export async function cancelAppointmentApi(
  appointmentId: string,
  reason: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/appointments/${encodeURIComponent(appointmentId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

/**
 * Retrieves the pre-consultation intake form for an appointment.
 * GET /api/v1/appointments/:appointmentId/pre-consultation
 */
export async function getPreConsultationApi(
  appointmentId: string
): Promise<PreConsultationResponseDto> {
  return apiFetch<PreConsultationResponseDto>(
    `/appointments/${encodeURIComponent(appointmentId)}/pre-consultation`
  );
}

/**
 * Saves/updates a pre-consultation intake draft.
 * POST /api/v1/appointments/:appointmentId/pre-consultation
 */
export async function saveDraftPreConsultationApi(
  appointmentId: string,
  dto: PreConsultationDraftDto
): Promise<PreConsultationResponseDto> {
  return apiFetch<PreConsultationResponseDto>(
    `/appointments/${encodeURIComponent(appointmentId)}/pre-consultation`,
    {
      method: 'POST',
      body: JSON.stringify(dto),
    }
  );
}

/**
 * Submits and locks a pre-consultation intake.
 * POST /api/v1/appointments/:appointmentId/pre-consultation/submit
 */
export async function submitPreConsultationApi(
  appointmentId: string
): Promise<PreConsultationResponseDto> {
  return apiFetch<PreConsultationResponseDto>(
    `/appointments/${encodeURIComponent(appointmentId)}/pre-consultation/submit`,
    {
      method: 'POST',
    }
  );
}
