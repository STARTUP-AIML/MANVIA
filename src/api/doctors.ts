import { apiFetch, ApiError } from './client.js';
import type {
  DoctorPublic,
  DoctorQueryParams,
  PaginatedDoctorsResponse,
  Specialty,
  Language,
  DoctorAvailabilityWindow,
  DoctorConsultationOffer,
} from '../types/doctors.js';

export async function searchDoctorsApi(
  params?: DoctorQueryParams
): Promise<PaginatedDoctorsResponse> {
  const query = new URLSearchParams();
  if (params?.specialty) {
    query.set('specialty', params.specialty);
  }
  if (params?.language) {
    query.set('language', params.language);
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const qs = query.toString();
  const endpoint = qs ? `/doctors?${qs}` : '/doctors';
  return apiFetch<PaginatedDoctorsResponse>(endpoint);
}

export async function getDoctorByIdApi(doctorId: string): Promise<DoctorPublic> {
  return apiFetch<DoctorPublic>(`/doctors/${encodeURIComponent(doctorId)}`);
}

export async function getSpecialtiesApi(): Promise<Specialty[]> {
  return apiFetch<Specialty[]>('/doctors/specialties');
}

export async function getLanguagesApi(): Promise<Language[]> {
  return apiFetch<Language[]>('/doctors/languages');
}

export async function getDoctorAvailabilityApi(
  publicDoctorId: string
): Promise<DoctorAvailabilityWindow[]> {
  try {
    return await apiFetch<DoctorAvailabilityWindow[]>(
      `/doctors/${encodeURIComponent(publicDoctorId)}/availability`
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Unverified doctor or schedule not published yet
      return [];
    }
    throw err;
  }
}

export async function getDoctorOffersApi(
  publicDoctorId: string
): Promise<DoctorConsultationOffer[]> {
  try {
    return await apiFetch<DoctorConsultationOffer[]>(
      `/doctors/${encodeURIComponent(publicDoctorId)}/offers`
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      // Unverified doctor or offers not published yet
      return [];
    }
    throw err;
  }
}
