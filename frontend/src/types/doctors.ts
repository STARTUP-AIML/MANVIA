export type DoctorVerificationStatus = 'DRAFT' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';

export type ConsultationType = 'INITIAL' | 'FOLLOW_UP' | 'GENERAL' | 'SPECIALIST';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface DoctorQualification {
  qualification: string;
  institution: string;
  fieldOfStudy?: string | null;
  graduationYear?: number | null;
}

export interface DoctorPublic {
  publicDoctorId: string;
  displayName: string;
  bio: string | null;
  primarySpecialty: string | null;
  subSpecialties: string[];
  languages: string[];
  yearsOfExperience: number;
  defaultConsultationFee: number;
  currency: string;
  verificationStatus: DoctorVerificationStatus | string;
  qualifications: DoctorQualification[];
}

export interface Specialty {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Language {
  id: string;
  code: string;
  name: string;
}

export interface DoctorAvailabilityWindow {
  id: string;
  timezone: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface DoctorConsultationOffer {
  id: string;
  title: string;
  description?: string | null;
  consultationType: ConsultationType;
  durationMinutes: number;
  fee: number;
  currency: string;
}

export interface DoctorQueryParams {
  specialty?: string;
  language?: string;
  limit?: number;
  offset?: number;
  search?: string; // Client-side search enhancement
}

export interface PaginatedDoctorsResponse {
  data: DoctorPublic[];
  total: number;
  limit: number;
  offset: number;
}

export interface DoctorSpecialtyLink {
  id: string;
  specialtyId: string;
  isPrimary: boolean;
  specialty?: Specialty;
}

export interface DoctorLanguageLink {
  id: string;
  languageId: string;
  language?: Language;
}

export interface DoctorSelfProfile {
  id: string;
  userId: string;
  publicDoctorId: string;
  displayName: string;
  bio?: string | null;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience: number;
  verificationStatus: DoctorVerificationStatus | string;
  defaultConsultationFee: number;
  currency: string;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  specialties: DoctorSpecialtyLink[];
  languages: DoctorLanguageLink[];
  qualifications: DoctorQualification[];
}

export interface VerificationDocument {
  id: string;
  documentType: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  createdAt: string;
}

export interface DoctorVerificationResponse {
  id: string;
  status: DoctorVerificationStatus | string;
  submissionNotes?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  documents: VerificationDocument[];
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  timezone: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationOffer {
  id: string;
  doctorId: string;
  title: string;
  description?: string | null;
  consultationType: ConsultationType;
  durationMinutes: number;
  fee: number;
  currency: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface VerificationReview {
  id: string;
  reviewerAdminId: string;
  action: 'APPROVED' | 'REJECTED';
  reason?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface AdminVerificationDetail {
  id: string;
  doctorId: string;
  status: DoctorVerificationStatus | string;
  submissionNotes?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  doctorProfile?: {
    id: string;
    userId: string;
    publicDoctorId: string;
    displayName: string;
    medicalRegistrationNumber: string;
    licensingCouncil: string;
    yearsOfExperience: number;
  };
  documents: VerificationDocument[];
  reviews: VerificationReview[];
}

export interface AdminVerificationListResponse {
  items: AdminVerificationDetail[];
  total: number;
  limit: number;
  offset: number;
}
