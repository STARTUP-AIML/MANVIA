import { apiFetch, ApiError } from './client';
import type {
  DoctorPublic,
  DoctorQueryParams,
  PaginatedDoctorsResponse,
  Specialty,
  Language,
  DoctorAvailabilityWindow,
  DoctorConsultationOffer,
  DoctorSelfProfile,
  DoctorVerificationResponse,
  VerificationDocument,
  DoctorAvailability,
  ConsultationOffer,
  AdminVerificationListResponse,
  AdminVerificationDetail,
  DayOfWeek,
  ConsultationType,
} from '@/types/';

// ============================================================================
// Public Doctor Discovery API
// ============================================================================

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
      return [];
    }
    throw err;
  }
}

// ============================================================================
// Doctor Self-Service Profile API
// ============================================================================

export interface CreateDoctorProfilePayload {
  displayName: string;
  bio?: string;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience?: number;
  defaultConsultationFee?: number;
  currency?: string;
  specialties?: Array<{ specialtyId: string; isPrimary?: boolean }>;
  languages?: Array<{ languageId: string }>;
  qualifications?: Array<{
    qualification: string;
    institution: string;
    fieldOfStudy?: string;
    graduationYear?: number;
  }>;
}

export interface UpdateDoctorProfilePayload {
  displayName?: string;
  bio?: string;
  yearsOfExperience?: number;
  defaultConsultationFee?: number;
  currency?: string;
  specialties?: Array<{ specialtyId: string; isPrimary?: boolean }>;
  languages?: Array<{ languageId: string }>;
  qualifications?: Array<{
    qualification: string;
    institution: string;
    fieldOfStudy?: string;
    graduationYear?: number;
  }>;
}

export async function getDoctorSelfProfileApi(): Promise<DoctorSelfProfile> {
  return apiFetch<DoctorSelfProfile>('/doctors/me');
}

export async function createDoctorProfileApi(
  data: CreateDoctorProfilePayload
): Promise<DoctorSelfProfile> {
  return apiFetch<DoctorSelfProfile>('/doctors/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDoctorSelfProfileApi(
  data: UpdateDoctorProfilePayload
): Promise<DoctorSelfProfile> {
  return apiFetch<DoctorSelfProfile>('/doctors/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Doctor Verification Workflow API
// ============================================================================

export interface UploadDocumentPayload {
  documentType: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  contentBase64?: string;
}

export async function getDoctorVerificationApi(): Promise<DoctorVerificationResponse> {
  return apiFetch<DoctorVerificationResponse>('/doctors/me/verification');
}

export async function createOrUpdateVerificationDraftApi(
  notes?: string
): Promise<DoctorVerificationResponse> {
  return apiFetch<DoctorVerificationResponse>('/doctors/me/verification', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function uploadVerificationDocumentApi(
  data: UploadDocumentPayload
): Promise<VerificationDocument> {
  return apiFetch<VerificationDocument>('/doctors/me/verification/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function submitDoctorVerificationApi(
  notes?: string
): Promise<DoctorVerificationResponse> {
  return apiFetch<DoctorVerificationResponse>('/doctors/me/verification/submit', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function getDoctorDocumentAccessUrlApi(
  documentId: string
): Promise<{ documentId: string; accessUrl: string; expiresInSeconds: number }> {
  return apiFetch<{ documentId: string; accessUrl: string; expiresInSeconds: number }>(
    `/doctors/me/verification/documents/${encodeURIComponent(documentId)}/access`
  );
}

// ============================================================================
// Doctor Availability Schedule API
// ============================================================================

export interface CreateAvailabilityPayload {
  timezone: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  isActive?: boolean;
}

export interface UpdateAvailabilityPayload {
  startTime?: string;
  endTime?: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  isActive?: boolean;
}

export async function getDoctorSelfAvailabilityApi(
  includeInactive = true
): Promise<DoctorAvailability[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiFetch<DoctorAvailability[]>(`/doctors/me/availability${query}`);
}

export async function createDoctorAvailabilityApi(
  data: CreateAvailabilityPayload
): Promise<DoctorAvailability> {
  return apiFetch<DoctorAvailability>('/doctors/me/availability', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDoctorAvailabilityApi(
  id: string,
  data: UpdateAvailabilityPayload
): Promise<DoctorAvailability> {
  return apiFetch<DoctorAvailability>(`/doctors/me/availability/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteDoctorAvailabilityApi(
  id: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/doctors/me/availability/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================================================
// Consultation Offers API
// ============================================================================

export interface CreateOfferPayload {
  title: string;
  description?: string;
  consultationType: ConsultationType;
  durationMinutes: number;
  fee: number;
  currency?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export interface UpdateOfferPayload {
  title?: string;
  description?: string;
  consultationType?: ConsultationType;
  durationMinutes?: number;
  fee?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

export async function getDoctorSelfOffersApi(
  includeInactive = true
): Promise<ConsultationOffer[]> {
  const query = includeInactive ? '?includeInactive=true' : '';
  return apiFetch<ConsultationOffer[]>(`/doctors/me/consultation-offers${query}`);
}

export async function createDoctorOfferApi(
  data: CreateOfferPayload
): Promise<ConsultationOffer> {
  return apiFetch<ConsultationOffer>('/doctors/me/consultation-offers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDoctorOfferApi(
  id: string,
  data: UpdateOfferPayload
): Promise<ConsultationOffer> {
  return apiFetch<ConsultationOffer>(
    `/doctors/me/consultation-offers/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteDoctorOfferApi(
  id: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(
    `/doctors/me/consultation-offers/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}

// ============================================================================
// Admin Doctor Verification Queue & Review API
// ============================================================================

export async function listAdminVerificationsApi(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminVerificationListResponse> {
  const query = new URLSearchParams();
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params?.offset !== undefined) {
    query.set('offset', String(params.offset));
  }

  const qs = query.toString();
  const endpoint = qs
    ? `/admin/doctor-verifications?${qs}`
    : '/admin/doctor-verifications';
  return apiFetch<AdminVerificationListResponse>(endpoint);
}

export async function getAdminVerificationDetailApi(
  id: string
): Promise<AdminVerificationDetail> {
  return apiFetch<AdminVerificationDetail>(
    `/admin/doctor-verifications/${encodeURIComponent(id)}`
  );
}

export async function approveDoctorVerificationApi(
  id: string,
  notes?: string
): Promise<AdminVerificationDetail> {
  return apiFetch<AdminVerificationDetail>(
    `/admin/doctor-verifications/${encodeURIComponent(id)}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }
  );
}

export async function rejectDoctorVerificationApi(
  id: string,
  reason: string,
  notes?: string
): Promise<AdminVerificationDetail> {
  return apiFetch<AdminVerificationDetail>(
    `/admin/doctor-verifications/${encodeURIComponent(id)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, notes }),
    }
  );
}

export async function getAdminDocumentAccessUrlApi(
  verificationId: string,
  documentId: string
): Promise<{ documentId: string; accessUrl: string; expiresInSeconds: number }> {
  return apiFetch<{ documentId: string; accessUrl: string; expiresInSeconds: number }>(
    `/admin/doctor-verifications/${encodeURIComponent(
      verificationId
    )}/documents/${encodeURIComponent(documentId)}/access`
  );
}
