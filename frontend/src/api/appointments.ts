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
  if (params?.upcoming || params?.timeFilter === 'UPCOMING') {
    query.set('upcoming', 'true');
  } else if (params?.past || params?.timeFilter === 'PAST') {
    query.set('past', 'true');
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

/**
 * Doctor: Retrieves paginated appointments for the authenticated physician.
 * GET /api/v1/doctor/appointments
 */
export async function getDoctorAppointmentsApi(
  params?: AppointmentQueryParams
): Promise<PaginatedAppointmentsResponseDto> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.upcoming || params?.timeFilter === 'UPCOMING') {
    query.set('upcoming', 'true');
  } else if (params?.past || params?.timeFilter === 'PAST') {
    query.set('past', 'true');
  }
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }

  const qs = query.toString();
  const endpoint = qs ? `/doctor/appointments?${qs}` : '/doctor/appointments';
  return apiFetch<PaginatedAppointmentsResponseDto>(endpoint);
}

/**
 * Doctor: Retrieves a single appointment for the authenticated physician.
 * GET /api/v1/doctor/appointments/:appointmentId
 */
export async function getDoctorAppointmentByIdApi(
  appointmentId: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}`
  );
}

/**
 * Doctor: Accepts and confirms an appointment request.
 * POST /api/v1/doctor/appointments/:appointmentId/accept
 */
export async function acceptDoctorAppointmentApi(
  appointmentId: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/accept`,
    {
      method: 'POST',
    }
  );
}

/**
 * Doctor: Declines an appointment request.
 * POST /api/v1/doctor/appointments/:appointmentId/decline
 */
export async function declineDoctorAppointmentApi(
  appointmentId: string,
  reason: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/decline`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

/**
 * Doctor: Cancels a confirmed appointment.
 * POST /api/v1/doctor/appointments/:appointmentId/cancel
 */
export async function cancelDoctorAppointmentApi(
  appointmentId: string,
  reason: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }
  );
}

/**
 * Doctor: Starts an in-progress consultation appointment.
 * POST /api/v1/doctor/appointments/:appointmentId/start
 */
export async function startDoctorAppointmentApi(
  appointmentId: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/start`,
    {
      method: 'POST',
    }
  );
}

/**
 * Doctor: Completes a consultation appointment.
 * POST /api/v1/doctor/appointments/:appointmentId/complete
 */
export async function completeDoctorAppointmentApi(
  appointmentId: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/complete`,
    {
      method: 'POST',
    }
  );
}

/**
 * Doctor: Marks an appointment as patient no-show.
 * POST /api/v1/doctor/appointments/:appointmentId/no-show
 */
export async function markNoShowDoctorAppointmentApi(
  appointmentId: string
): Promise<AppointmentResponseDto> {
  return apiFetch<AppointmentResponseDto>(
    `/doctor/appointments/${encodeURIComponent(appointmentId)}/no-show`,
    {
      method: 'POST',
    }
  );
}
