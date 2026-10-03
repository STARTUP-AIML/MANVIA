import type { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import type { VerificationDocumentEntity } from './verification-document.entity.js';
import type { VerificationReviewEntity } from './verification-review.entity.js';

export interface DoctorProfileSummary {
  id: string;
  userId: string;
  publicDoctorId: string;
  displayName: string;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience: number;
}

export interface DoctorVerificationEntity {
  id: string;
  doctorId: string;
  status: DoctorVerificationStatus;
  submissionNotes: string | null;
  rejectionReason: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  documents?: VerificationDocumentEntity[] | undefined;
  reviews?: VerificationReviewEntity[] | undefined;
  doctorProfile?: DoctorProfileSummary | undefined;
}
