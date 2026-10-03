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
