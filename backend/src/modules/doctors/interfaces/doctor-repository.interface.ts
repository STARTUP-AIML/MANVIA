import type { DoctorProfileEntity } from '../entities/doctor-profile.entity.js';
import type { SpecialtyEntity } from '../entities/specialty.entity.js';
import type { LanguageEntity } from '../entities/language.entity.js';
import type { VerificationStatus } from '../enums/verification-status.enum.js';

export interface DoctorFilterCriteria {
  specialty?: string | undefined;
  language?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface CreateDoctorProfileData {
  userId: string;
  publicDoctorId: string;
  displayName: string;
  bio?: string | null | undefined;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience?: number | undefined;
  defaultConsultationFee?: number | undefined;
  currency?: string | undefined;
  specialties?: Array<{ specialtyId: string; isPrimary?: boolean | undefined }> | undefined;
  languages?: Array<{ languageId: string }> | undefined;
  qualifications?:
    | Array<{
        qualification: string;
        institution: string;
        fieldOfStudy?: string | null | undefined;
        graduationYear?: number | null | undefined;
      }>
    | undefined;
}

export interface UpdateDoctorProfileData {
  displayName?: string | undefined;
  bio?: string | null | undefined;
  yearsOfExperience?: number | undefined;
  defaultConsultationFee?: number | undefined;
  currency?: string | undefined;
  specialties?: Array<{ specialtyId: string; isPrimary?: boolean | undefined }> | undefined;
  languages?: Array<{ languageId: string }> | undefined;
  qualifications?:
    | Array<{
        qualification: string;
        institution: string;
        fieldOfStudy?: string | null | undefined;
        graduationYear?: number | null | undefined;
      }>
    | undefined;
}

export interface IDoctorsRepository {
  createProfile(data: CreateDoctorProfileData): Promise<DoctorProfileEntity>;
  findById(id: string): Promise<DoctorProfileEntity | null>;
  findByUserId(userId: string): Promise<DoctorProfileEntity | null>;
  findByPublicId(publicId: string): Promise<DoctorProfileEntity | null>;
  findByRegistrationNumber(registrationNumber: string): Promise<DoctorProfileEntity | null>;
  updateProfile(id: string, data: UpdateDoctorProfileData): Promise<DoctorProfileEntity>;
  updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    verifiedAt?: Date | null | undefined,
  ): Promise<DoctorProfileEntity>;
  findPublicDoctors(
    criteria: DoctorFilterCriteria,
  ): Promise<{ doctors: DoctorProfileEntity[]; total: number }>;

  // Taxonomy access
  findActiveSpecialties(): Promise<SpecialtyEntity[]>;
  findSpecialtyById(id: string): Promise<SpecialtyEntity | null>;
  findSpecialtyByCode(code: string): Promise<SpecialtyEntity | null>;
  findAllLanguages(): Promise<LanguageEntity[]>;
  findLanguageById(id: string): Promise<LanguageEntity | null>;
  findLanguageByCode(code: string): Promise<LanguageEntity | null>;
}

export const DOCTORS_REPOSITORY = Symbol('DOCTORS_REPOSITORY');
