/**
 * Phase 9: Health Records & Consents API Client
 * Derived strictly from backend controllers:
 * - PatientHealthRecordsController (backend/src/modules/health-records/controllers/patient-health-records.controller.ts)
 * - PatientConsentsController (backend/src/modules/care-relationships/controllers/patient-consents.controller.ts)
 */

import { apiFetch } from './client.js';
import type {
  CreateUploadIntentDto,
  UploadIntentResponseDto,
  CreateHealthRecordDto,
  HealthRecordResponseDto,
  PaginatedHealthRecordsResponseDto,
  HealthRecordQueryParams,
  DownloadUrlResponseDto,
  UpdateHealthRecordDto,
  ConsentResponseDto,
  GrantConsentDto,
  RevokeConsentDto,
  ConsentDetailResponseDto,
} from '../types/healthRecords.js';

// ─────────────────────────────────────────────────────────────────────────────
// Health Records APIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request presigned upload URL for a health record document.
 * POST /api/v1/health-records/upload-intent
 */
export async function createUploadIntentApi(
  dto: CreateUploadIntentDto
): Promise<UploadIntentResponseDto> {
  return apiFetch<UploadIntentResponseDto>('/health-records/upload-intent', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Upload binary file to presigned URL using PUT method.
 * Direct binary payload transfer to storage vault.
 */
export async function uploadFileToPresignedUrlApi(
  uploadUrl: string,
  file: Blob | ArrayBuffer,
  headers?: Record<string, string>
): Promise<void> {
  const reqHeaders: Record<string, string> = {
    ...(headers || {}),
  };

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: reqHeaders,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Binary upload failed with HTTP status ${response.status}`);
  }
}

/**
 * Finalize document upload and transition record to AVAILABLE status.
 * POST /api/v1/health-records/:recordId/finalize
 */
export async function finalizeUploadApi(
  recordId: string
): Promise<HealthRecordResponseDto> {
  return apiFetch<HealthRecordResponseDto>(`/health-records/${encodeURIComponent(recordId)}/finalize`, {
    method: 'POST',
  });
}

/**
 * Directly create and index a health record (supports Base64 content).
 * POST /api/v1/health-records
 */
export async function createHealthRecordDirectApi(
  dto: CreateHealthRecordDto
): Promise<HealthRecordResponseDto> {
  return apiFetch<HealthRecordResponseDto>('/health-records', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * List health records belonging to authenticated patient with pagination and filters.
 * GET /api/v1/health-records
 */
export async function getPatientHealthRecordsApi(
  params?: HealthRecordQueryParams
): Promise<PaginatedHealthRecordsResponseDto> {
  const query = new URLSearchParams();
  if (params?.category) {
    query.set('category', params.category);
  }
  if (params?.status) {
    query.set('status', params.status);
  }
  if (params?.fromRecordedDate) {
    query.set('fromRecordedDate', params.fromRecordedDate);
  }
  if (params?.toRecordedDate) {
    query.set('toRecordedDate', params.toRecordedDate);
  }
  if (params?.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params?.limit !== undefined) {
    query.set('limit', String(params.limit));
  }

  const qs = query.toString();
  return apiFetch<PaginatedHealthRecordsResponseDto>(`/health-records${qs ? `?${qs}` : ''}`);
}

/**
 * Get details of a specific health record by UUID or public ID.
 * GET /api/v1/health-records/:recordId
 */
export async function getHealthRecordByIdApi(
  recordId: string
): Promise<HealthRecordResponseDto> {
  return apiFetch<HealthRecordResponseDto>(`/health-records/${encodeURIComponent(recordId)}`);
}

/**
 * Request time-limited (5-min) signed download URL for record document.
 * GET /api/v1/health-records/:recordId/download-url
 */
export async function getRecordDownloadUrlApi(
  recordId: string
): Promise<DownloadUrlResponseDto> {
  return apiFetch<DownloadUrlResponseDto>(`/health-records/${encodeURIComponent(recordId)}/download-url`);
}

/**
 * Update health record metadata.
 * PATCH /api/v1/health-records/:recordId
 */
export async function updateHealthRecordApi(
  recordId: string,
  dto: UpdateHealthRecordDto
): Promise<HealthRecordResponseDto> {
  return apiFetch<HealthRecordResponseDto>(`/health-records/${encodeURIComponent(recordId)}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

/**
 * Soft-delete / archive a health record.
 * DELETE /api/v1/health-records/:recordId
 */
export async function deleteHealthRecordApi(
  recordId: string
): Promise<HealthRecordResponseDto> {
  return apiFetch<HealthRecordResponseDto>(`/health-records/${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent APIs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List consents granted by authenticated patient.
 * GET /api/v1/consents
 */
export async function getPatientConsentsApi(): Promise<ConsentResponseDto[]> {
  return apiFetch<ConsentResponseDto[]>('/consents');
}

/**
 * Grant granular health resource consent to a physician.
 * POST /api/v1/consents
 */
export async function grantConsentApi(
  dto: GrantConsentDto
): Promise<ConsentResponseDto[]> {
  return apiFetch<ConsentResponseDto[]>('/consents', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Get consent details and immutable audit history.
 * GET /api/v1/consents/:id
 */
export async function getConsentDetailsApi(
  id: string
): Promise<ConsentDetailResponseDto> {
  return apiFetch<ConsentDetailResponseDto>(`/consents/${encodeURIComponent(id)}`);
}

/**
 * Revoke active consent grant.
 * POST /api/v1/consents/:id/revoke
 */
export async function revokeConsentApi(
  id: string,
  dto: RevokeConsentDto
): Promise<ConsentResponseDto> {
  return apiFetch<ConsentResponseDto>(`/consents/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}
