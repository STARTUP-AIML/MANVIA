import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { ConflictError, NotFoundError } from '../../../common/errors/app-error.js';
import { VerificationStatus } from '../enums/verification-status.enum.js';
import type {
  DoctorProfileEntity,
  DoctorSpecialtyEntity,
  DoctorLanguageEntity,
  DoctorQualificationEntity,
} from '../entities/doctor-profile.entity.js';
import type { SpecialtyEntity } from '../entities/specialty.entity.js';
import type { LanguageEntity } from '../entities/language.entity.js';
import type {
  IDoctorsRepository,
  DoctorFilterCriteria,
  CreateDoctorProfileData,
  UpdateDoctorProfileData,
} from '../interfaces/doctor-repository.interface.js';

@Injectable()
export class InMemoryDoctorsRepository implements IDoctorsRepository {
  private readonly profiles = new Map<string, DoctorProfileEntity>();
  private readonly specialties = new Map<string, SpecialtyEntity>();
  private readonly languages = new Map<string, LanguageEntity>();

  constructor() {
    this.seedDefaultTaxonomies();
  }

  public async createProfile(data: CreateDoctorProfileData): Promise<DoctorProfileEntity> {
    // Uniqueness checks
    for (const existing of this.profiles.values()) {
      if (existing.userId === data.userId) {
        throw new ConflictError('A doctor profile already exists for this user account');
      }
      if (existing.publicDoctorId === data.publicDoctorId) {
        throw new ConflictError('Public doctor ID collision detected');
      }
      if (
        existing.medicalRegistrationNumber.toLowerCase() ===
        data.medicalRegistrationNumber.toLowerCase()
      ) {
        throw new ConflictError('Medical registration number is already registered');
      }
    }

    const doctorId = crypto.randomUUID();
    const now = new Date();

    // Map specialties
    const doctorSpecialties: DoctorSpecialtyEntity[] = [];
    if (data.specialties) {
      const seenSpecialtyIds = new Set<string>();
      for (const item of data.specialties) {
        const specialty = this.specialties.get(item.specialtyId);
        if (!specialty) {
          throw new NotFoundError(`Specialty with ID '${item.specialtyId}' does not exist`);
        }
        if (seenSpecialtyIds.has(item.specialtyId)) {
          throw new ConflictError(`Duplicate specialty assignment: '${specialty.name}'`);
        }
        seenSpecialtyIds.add(item.specialtyId);

        doctorSpecialties.push({
          id: crypto.randomUUID(),
          doctorId,
          specialtyId: item.specialtyId,
          isPrimary: item.isPrimary ?? false,
          specialty,
          createdAt: now,
        });
      }
    }

    // Map languages
    const doctorLanguages: DoctorLanguageEntity[] = [];
    if (data.languages) {
      const seenLanguageIds = new Set<string>();
      for (const item of data.languages) {
        const language = this.languages.get(item.languageId);
        if (!language) {
          throw new NotFoundError(`Language with ID '${item.languageId}' does not exist`);
        }
        if (seenLanguageIds.has(item.languageId)) {
          throw new ConflictError(`Duplicate language assignment: '${language.name}'`);
        }
        seenLanguageIds.add(item.languageId);

        doctorLanguages.push({
          id: crypto.randomUUID(),
          doctorId,
          languageId: item.languageId,
          language,
          createdAt: now,
        });
      }
    }

    // Map qualifications
    const doctorQualifications: DoctorQualificationEntity[] = (data.qualifications ?? []).map(
      (q) => ({
        id: crypto.randomUUID(),
        doctorId,
        qualification: q.qualification,
        institution: q.institution,
        fieldOfStudy: q.fieldOfStudy ?? null,
        graduationYear: q.graduationYear ?? null,
        createdAt: now,
        updatedAt: now,
      }),
    );

    const profile: DoctorProfileEntity = {
      id: doctorId,
      userId: data.userId,
      publicDoctorId: data.publicDoctorId,
      displayName: data.displayName,
      bio: data.bio ?? null,
      medicalRegistrationNumber: data.medicalRegistrationNumber,
      licensingCouncil: data.licensingCouncil,
      yearsOfExperience: data.yearsOfExperience ?? 0,
      verificationStatus: VerificationStatus.DRAFT,
      defaultConsultationFee: data.defaultConsultationFee ?? 0,
      currency: data.currency ?? 'USD',
      verifiedAt: null,
      createdAt: now,
      updatedAt: now,
      specialties: doctorSpecialties,
      languages: doctorLanguages,
      qualifications: doctorQualifications,
    };

    this.profiles.set(doctorId, profile);
    return this.cloneProfile(profile);
  }

  public async findById(id: string): Promise<DoctorProfileEntity | null> {
    const profile = this.profiles.get(id);
    return profile ? this.cloneProfile(profile) : null;
  }

  public async findByUserId(userId: string): Promise<DoctorProfileEntity | null> {
    for (const profile of this.profiles.values()) {
      if (profile.userId === userId) {
        return this.cloneProfile(profile);
      }
    }
    return null;
  }

  public async findByPublicId(publicId: string): Promise<DoctorProfileEntity | null> {
    for (const profile of this.profiles.values()) {
      if (profile.publicDoctorId.toLowerCase() === publicId.toLowerCase()) {
        return this.cloneProfile(profile);
      }
    }
    return null;
  }

  public async findByRegistrationNumber(
    registrationNumber: string,
  ): Promise<DoctorProfileEntity | null> {
    for (const profile of this.profiles.values()) {
      if (profile.medicalRegistrationNumber.toLowerCase() === registrationNumber.toLowerCase()) {
        return this.cloneProfile(profile);
      }
    }
    return null;
  }

  public async updateProfile(
    id: string,
    data: UpdateDoctorProfileData,
  ): Promise<DoctorProfileEntity> {
    const existing = this.profiles.get(id);
    if (!existing) {
      throw new NotFoundError(`Doctor profile with ID '${id}' not found`);
    }

    const now = new Date();

    // Update scalar fields
    if (data.displayName !== undefined) existing.displayName = data.displayName;
    if (data.bio !== undefined) existing.bio = data.bio;
    if (data.yearsOfExperience !== undefined) existing.yearsOfExperience = data.yearsOfExperience;
    if (data.defaultConsultationFee !== undefined) {
      existing.defaultConsultationFee = data.defaultConsultationFee;
    }
    if (data.currency !== undefined) existing.currency = data.currency;

    // Update specialties if provided
    if (data.specialties !== undefined) {
      const newSpecialties: DoctorSpecialtyEntity[] = [];
      const seenSpecialtyIds = new Set<string>();

      for (const item of data.specialties) {
        const specialty = this.specialties.get(item.specialtyId);
        if (!specialty) {
          throw new NotFoundError(`Specialty with ID '${item.specialtyId}' does not exist`);
        }
        if (seenSpecialtyIds.has(item.specialtyId)) {
          throw new ConflictError(`Duplicate specialty assignment: '${specialty.name}'`);
        }
        seenSpecialtyIds.add(item.specialtyId);

        newSpecialties.push({
          id: crypto.randomUUID(),
          doctorId: id,
          specialtyId: item.specialtyId,
          isPrimary: item.isPrimary ?? false,
          specialty,
          createdAt: now,
        });
      }
      existing.specialties = newSpecialties;
    }

    // Update languages if provided
    if (data.languages !== undefined) {
      const newLanguages: DoctorLanguageEntity[] = [];
      const seenLanguageIds = new Set<string>();

      for (const item of data.languages) {
        const language = this.languages.get(item.languageId);
        if (!language) {
          throw new NotFoundError(`Language with ID '${item.languageId}' does not exist`);
        }
        if (seenLanguageIds.has(item.languageId)) {
          throw new ConflictError(`Duplicate language assignment: '${language.name}'`);
        }
        seenLanguageIds.add(item.languageId);

        newLanguages.push({
          id: crypto.randomUUID(),
          doctorId: id,
          languageId: item.languageId,
          language,
          createdAt: now,
        });
      }
      existing.languages = newLanguages;
    }

    // Update qualifications if provided
    if (data.qualifications !== undefined) {
      existing.qualifications = data.qualifications.map((q) => ({
        id: crypto.randomUUID(),
        doctorId: id,
        qualification: q.qualification,
        institution: q.institution,
        fieldOfStudy: q.fieldOfStudy ?? null,
        graduationYear: q.graduationYear ?? null,
        createdAt: now,
        updatedAt: now,
      }));
    }

    existing.updatedAt = now;
    this.profiles.set(id, existing);
    return this.cloneProfile(existing);
  }

  public async findPublicDoctors(
    criteria: DoctorFilterCriteria,
  ): Promise<{ doctors: DoctorProfileEntity[]; total: number }> {
    let filtered = Array.from(this.profiles.values());

    // Filter by specialty if requested
    if (criteria.specialty) {
      const specQuery = criteria.specialty.toLowerCase();
      filtered = filtered.filter((doc) =>
        doc.specialties.some(
          (s) =>
            s.specialty?.code.toLowerCase() === specQuery ||
            s.specialty?.name.toLowerCase().includes(specQuery),
        ),
      );
    }

    // Filter by language if requested
    if (criteria.language) {
      const langQuery = criteria.language.toLowerCase();
      filtered = filtered.filter((doc) =>
        doc.languages.some(
          (l) =>
            l.language?.code.toLowerCase() === langQuery ||
            l.language?.name.toLowerCase().includes(langQuery),
        ),
      );
    }

    const total = filtered.length;
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? 20;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      doctors: paginated.map((p) => this.cloneProfile(p)),
      total,
    };
  }

  // ----------------------------------------------------------------------------
  // Taxonomy Operations
  // ----------------------------------------------------------------------------

  public async findActiveSpecialties(): Promise<SpecialtyEntity[]> {
    return Array.from(this.specialties.values())
      .filter((s) => s.isActive)
      .map((s) => ({ ...s }));
  }

  public async findSpecialtyById(id: string): Promise<SpecialtyEntity | null> {
    const s = this.specialties.get(id);
    return s ? { ...s } : null;
  }

  public async findSpecialtyByCode(code: string): Promise<SpecialtyEntity | null> {
    for (const s of this.specialties.values()) {
      if (s.code.toLowerCase() === code.toLowerCase()) {
        return { ...s };
      }
    }
    return null;
  }

  public async findAllLanguages(): Promise<LanguageEntity[]> {
    return Array.from(this.languages.values()).map((l) => ({ ...l }));
  }

  public async findLanguageById(id: string): Promise<LanguageEntity | null> {
    const l = this.languages.get(id);
    return l ? { ...l } : null;
  }

  public async findLanguageByCode(code: string): Promise<LanguageEntity | null> {
    for (const l of this.languages.values()) {
      if (l.code.toLowerCase() === code.toLowerCase()) {
        return { ...l };
      }
    }
    return null;
  }

  // ----------------------------------------------------------------------------
  // Internal Helpers
  // ----------------------------------------------------------------------------

  public clear(): void {
    this.profiles.clear();
  }

  private cloneProfile(p: DoctorProfileEntity): DoctorProfileEntity {
    return {
      ...p,
      specialties: p.specialties.map((s) => ({
        ...s,
        specialty: s.specialty ? { ...s.specialty } : undefined,
      })),
      languages: p.languages.map((l) => ({
        ...l,
        language: l.language ? { ...l.language } : undefined,
      })),
      qualifications: p.qualifications.map((q) => ({ ...q })),
    };
  }

  private seedDefaultTaxonomies(): void {
    const defaultSpecialties = [
      {
        code: 'INTERNAL_MED',
        name: 'Internal Medicine',
        description: 'Comprehensive adult health and chronic disease care',
      },
      {
        code: 'CARDIO',
        name: 'Cardiology',
        description: 'Disorders of the heart and cardiovascular system',
      },
      {
        code: 'NEURO',
        name: 'Neurology',
        description: 'Disorders of the nervous system and brain',
      },
      {
        code: 'PEDIATRICS',
        name: 'Pediatrics',
        description: 'Medical care of infants, children, and adolescents',
      },
      {
        code: 'DERMATOLOGY',
        name: 'Dermatology',
        description: 'Skin, hair, and nail health and pathologies',
      },
      {
        code: 'PSYCHIATRY',
        name: 'Psychiatry',
        description: 'Mental health, behavioral conditions, and psychotherapy',
      },
      {
        code: 'GENERAL_PRACTICE',
        name: 'General Practice',
        description: 'Primary outpatient medical consultations',
      },
    ];

    const now = new Date();
    for (const spec of defaultSpecialties) {
      const id = crypto.randomUUID();
      this.specialties.set(id, {
        id,
        code: spec.code,
        name: spec.name,
        description: spec.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    const defaultLanguages = [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'hi', name: 'Hindi' },
      { code: 'te', name: 'Telugu' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
    ];

    for (const lang of defaultLanguages) {
      const id = crypto.randomUUID();
      this.languages.set(id, {
        id,
        code: lang.code,
        name: lang.name,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
