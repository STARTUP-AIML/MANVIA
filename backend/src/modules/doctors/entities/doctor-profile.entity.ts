import type { VerificationStatus } from '../enums/verification-status.enum.js';
import type { SpecialtyEntity } from './specialty.entity.js';
import type { LanguageEntity } from './language.entity.js';
import type { DoctorQualificationEntity } from './qualification.entity.js';

export type { DoctorQualificationEntity } from './qualification.entity.js';
export type { SpecialtyEntity } from './specialty.entity.js';
export type { LanguageEntity } from './language.entity.js';

export interface DoctorSpecialtyEntity {
  id: string;
  doctorId: string;
  specialtyId: string;
  isPrimary: boolean;
  specialty?: SpecialtyEntity | undefined;
  createdAt: Date;
}

export interface DoctorLanguageEntity {
  id: string;
  doctorId: string;
  languageId: string;
  language?: LanguageEntity | undefined;
  createdAt: Date;
}

export interface DoctorProfileEntity {
  id: string;
  userId: string;
  publicDoctorId: string;
  displayName: string;
  bio?: string | null | undefined;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience: number;
  verificationStatus: VerificationStatus;
  defaultConsultationFee: number;
  currency: string;
  verifiedAt?: Date | null | undefined;
  createdAt: Date;
  updatedAt: Date;

  specialties: DoctorSpecialtyEntity[];
  languages: DoctorLanguageEntity[];
  qualifications: DoctorQualificationEntity[];
}
