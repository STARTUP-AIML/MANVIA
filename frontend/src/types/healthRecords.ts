/**
 * Phase 9: Health Records, Media & Consent Types
 * Derived strictly from backend DTOs, Enums, and Models in:
 * - backend/src/modules/health-records/enums/health-record-category.enum.ts
 * - backend/src/modules/health-records/enums/health-record-status.enum.ts
 * - backend/src/modules/health-records/dto/create-upload-intent.dto.ts
 * - backend/src/modules/health-records/dto/upload-intent-response.dto.ts
 * - backend/src/modules/health-records/dto/create-health-record.dto.ts
 * - backend/src/modules/health-records/dto/health-record-response.dto.ts
 * - backend/src/modules/health-records/dto/download-url-response.dto.ts
 * - backend/src/modules/health-records/dto/update-health-record.dto.ts
 * - backend/src/modules/care-relationships/enums/consent-scope.enum.ts
 * - backend/src/modules/care-relationships/enums/consent-status.enum.ts
 * - backend/src/modules/care-relationships/enums/consent-action.enum.ts
 * - backend/src/modules/care-relationships/dto/grant-consent.dto.ts
 * - backend/src/modules/care-relationships/dto/revoke-consent.dto.ts
 * - backend/src/modules/care-relationships/dto/consent-response.dto.ts
 * - backend/src/modules/care-relationships/dto/consent-history-response.dto.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// Health Records Enums & Constants
// ─────────────────────────────────────────────────────────────────────────────

export const HealthRecordCategory = {
  LAB_REPORT: 'LAB_REPORT',
  PRESCRIPTION: 'PRESCRIPTION',
  CLINICAL_SUMMARY: 'CLINICAL_SUMMARY',
  IMAGING: 'IMAGING',
  DISCHARGE_SUMMARY: 'DISCHARGE_SUMMARY',
  OTHER: 'OTHER',
} as const;
export type HealthRecordCategory = (typeof HealthRecordCategory)[keyof typeof HealthRecordCategory];

export const HealthRecordStatus = {
  PENDING: 'PENDING',
  AVAILABLE: 'AVAILABLE',
  ARCHIVED: 'ARCHIVED',
  DELETED: 'DELETED',
} as const;
export type HealthRecordStatus = (typeof HealthRecordStatus)[keyof typeof HealthRecordStatus];

export const ALLOWED_HEALTH_RECORD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/dicom',
] as const;

export type AllowedHealthRecordMimeType = (typeof ALLOWED_HEALTH_RECORD_MIME_TYPES)[number];

export const MAX_HEALTH_RECORD_FILE_SIZE_BYTES = 26_214_400; // 25 MB

export const HEALTH_RECORD_CATEGORY_LABELS: Record<HealthRecordCategory, string> = {
  LAB_REPORT: 'Lab Report',
  PRESCRIPTION: 'Prescription',
  CLINICAL_SUMMARY: 'Clinical Summary',
  IMAGING: 'Medical Imaging',
  DISCHARGE_SUMMARY: 'Discharge Summary',
  OTHER: 'Other Document',
};

// ─────────────────────────────────────────────────────────────────────────────
// Health Records DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateUploadIntentDto {
  category: HealthRecordCategory;
  title: string;
  documentTitle?: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  fileMimeType?: string;
  recordedDate: string; // ISO 8601 YYYY-MM-DD
  description?: string;
  sha256Hash?: string;
}

export interface UploadIntentResponseDto {
  recordId: string;
  publicRecordId: string;
  uploadUrl: string;
  storageKey: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
}

export interface CreateHealthRecordDto {
  category: HealthRecordCategory;
  title: string;
  fileName: string;
  fileMimeType: string;
  fileContentBase64?: string;
  fileSizeBytes?: number;
  recordedDate: string; // ISO 8601 YYYY-MM-DD
  description?: string;
}

export interface HealthRecordResponseDto {
  id: string;
  publicRecordId: string;
  patientId: string;
  category: HealthRecordCategory;
  title: string;
  description?: string | null;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: HealthRecordStatus;
  recordedDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedHealthRecordsResponseDto {
  data: HealthRecordResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthRecordQueryParams {
  category?: HealthRecordCategory;
  status?: HealthRecordStatus;
  fromRecordedDate?: string;
  toRecordedDate?: string;
  page?: number;
  limit?: number;
}

export interface DownloadUrlResponseDto {
  recordId: string;
  publicRecordId: string;
  downloadUrl: string;
  expiresInSeconds: number;
}

export interface UpdateHealthRecordDto {
  title?: string;
  category?: HealthRecordCategory;
  recordedDate?: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent Enums & Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ConsentScope = {
  PATIENT_PROFILE: 'PATIENT_PROFILE',
  CONSULTATION_INFO: 'CONSULTATION_INFO',
  PRE_CONSULTATION: 'PRE_CONSULTATION',
  HEALTH_RECORDS: 'HEALTH_RECORDS',
  HEALTH_TIMELINE: 'HEALTH_TIMELINE',
  WELLNESS: 'WELLNESS',
} as const;
export type ConsentScope = (typeof ConsentScope)[keyof typeof ConsentScope];

export const ConsentStatus = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
} as const;
export type ConsentStatus = (typeof ConsentStatus)[keyof typeof ConsentStatus];

export const ConsentAction = {
  GRANTED: 'GRANTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
  SCOPE_UPDATED: 'SCOPE_UPDATED',
} as const;
export type ConsentAction = (typeof ConsentAction)[keyof typeof ConsentAction];

export const CONSENT_SCOPE_LABELS: Record<ConsentScope, string> = {
  HEALTH_RECORDS: 'Health Records & Documents',
  HEALTH_TIMELINE: 'Longitudinal Health Timeline',
  WELLNESS: 'Wellness Check-Ins & Trends',
  PRE_CONSULTATION: 'Pre-Consultation Intake Notes',
  CONSULTATION_INFO: 'Consultation & Visit Details',
  PATIENT_PROFILE: 'Basic Patient Profile',
};

export const CONSENT_SCOPE_DESCRIPTIONS: Record<ConsentScope, string> = {
  HEALTH_RECORDS: 'Permits physician to inspect uploaded medical reports, lab results, prescriptions, and imaging.',
  HEALTH_TIMELINE: 'Permits physician to review your chronological care journey and historical wellness checkpoints.',
  WELLNESS: 'Permits physician to track non-diagnostic mood, stress, sleep, and vitality patterns.',
  PRE_CONSULTATION: 'Permits physician to review symptoms and visit notes submitted ahead of appointments.',
  CONSULTATION_INFO: 'Permits physician to view past consultation summaries and recommendations.',
  PATIENT_PROFILE: 'Permits physician to see basic demographic and contact information.',
};

// ─────────────────────────────────────────────────────────────────────────────
// Consent DTOs
// ─────────────────────────────────────────────────────────────────────────────

export interface GrantConsentDto {
  doctorId: string;
  scopes: ConsentScope[];
  purpose?: string;
  expiresAt?: string; // ISO 8601
}

export interface RevokeConsentDto {
  reason?: string;
}

export interface ConsentResponseDto {
  id: string;
  publicPatientId: string;
  publicDoctorId: string;
  doctorDisplayName: string;
  careRelationshipId?: string | null;
  scope: ConsentScope;
  status: ConsentStatus;
  purpose?: string | null;
  isCurrentlyActive: boolean;
  grantedAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  revocationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentHistoryResponseDto {
  id: string;
  consentId: string;
  action: ConsentAction;
  actorId: string;
  actorRole: string;
  reason?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface ConsentDetailResponseDto {
  consent: ConsentResponseDto;
  history: ConsentHistoryResponseDto[];
}
