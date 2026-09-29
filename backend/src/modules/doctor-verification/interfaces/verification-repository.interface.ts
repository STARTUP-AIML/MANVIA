import type { DoctorVerificationEntity } from '../entities/doctor-verification.entity.js';
import type { VerificationDocumentEntity } from '../entities/verification-document.entity.js';
import type { VerificationReviewEntity } from '../entities/verification-review.entity.js';
import type { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import type { VerificationDocumentType } from '../enums/verification-document-type.enum.js';

export interface VerificationFilterCriteria {
  status?: DoctorVerificationStatus | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface CreateDocumentData {
  documentType: VerificationDocumentType;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface IDoctorVerificationRepository {
  findActiveByDoctorId(doctorId: string): Promise<DoctorVerificationEntity | null>;
  findById(id: string): Promise<DoctorVerificationEntity | null>;
  createDraft(doctorId: string, notes?: string | undefined): Promise<DoctorVerificationEntity>;
  updateDraft(id: string, notes?: string | undefined): Promise<DoctorVerificationEntity>;
  submitForReview(id: string, notes?: string | undefined): Promise<DoctorVerificationEntity>;
  addDocument(verificationId: string, doc: CreateDocumentData): Promise<VerificationDocumentEntity>;
  findDocumentById(documentId: string): Promise<VerificationDocumentEntity | null>;
  findDocumentsByVerificationId(verificationId: string): Promise<VerificationDocumentEntity[]>;
  findVerifications(
    criteria: VerificationFilterCriteria,
  ): Promise<{ verifications: DoctorVerificationEntity[]; total: number }>;
  approveVerification(
    id: string,
    adminId: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity>;
  rejectVerification(
    id: string,
    adminId: string,
    reason: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity>;
  getReviewHistory(verificationId: string): Promise<VerificationReviewEntity[]>;
}

export const DOCTOR_VERIFICATION_REPOSITORY = Symbol('DOCTOR_VERIFICATION_REPOSITORY');
