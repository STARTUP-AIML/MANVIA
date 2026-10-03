import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/app-error.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../interfaces/doctor-repository.interface.js';
import { generatePublicDoctorId } from '../utils/public-id.util.js';
import type { CreateDoctorProfileDto } from '../dto/create-doctor-profile.dto.js';
import type { UpdateDoctorProfileDto } from '../dto/update-doctor-profile.dto.js';
import type { DoctorQueryDto } from '../dto/doctor-query.dto.js';
import type { DoctorSelfResponseDto } from '../dto/doctor-self-response.dto.js';
import type { DoctorPublicResponseDto } from '../dto/doctor-public-response.dto.js';
import type { DoctorProfileEntity } from '../entities/doctor-profile.entity.js';

@Injectable()
export class DoctorsService {
  constructor(
    @Inject(DOCTORS_REPOSITORY)
    private readonly repository: IDoctorsRepository,
  ) {}

  /**
   * Initializes a new doctor profile tied to the authenticated user identity.
   * Auto-generates the canonical DOC-XXXXXXXX identifier and initializes status to DRAFT.
   */
  public async initializeProfile(
    userId: string,
    dto: CreateDoctorProfileDto,
  ): Promise<DoctorSelfResponseDto> {
    const publicDoctorId = generatePublicDoctorId();

    const created = await this.repository.createProfile({
      userId,
      publicDoctorId,
      displayName: dto.displayName.trim(),
      bio: dto.bio?.trim() ?? null,
      medicalRegistrationNumber: dto.medicalRegistrationNumber.trim(),
      licensingCouncil: dto.licensingCouncil.trim(),
      yearsOfExperience: dto.yearsOfExperience ?? 0,
      defaultConsultationFee: dto.defaultConsultationFee ?? 0,
      currency: dto.currency ?? 'USD',
      specialties: dto.specialties
        ? dto.specialties.map((s) => ({
            specialtyId: s.specialtyId,
            isPrimary: s.isPrimary ?? false,
          }))
        : undefined,
      languages: dto.languages
        ? dto.languages.map((l) => ({
            languageId: l.languageId,
          }))
        : undefined,
      qualifications: dto.qualifications
        ? dto.qualifications.map((q) => ({
            qualification: q.qualification.trim(),
            institution: q.institution.trim(),
            fieldOfStudy: q.fieldOfStudy?.trim() ?? null,
            graduationYear: q.graduationYear ?? null,
          }))
        : undefined,
    });

    return this.mapToSelfResponse(created);
  }

  /**
   * Retrieves the full private doctor profile for the authenticated physician.
   */
  public async getSelfProfile(userId: string): Promise<DoctorSelfResponseDto> {
    const profile = await this.repository.findByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }
    return this.mapToSelfResponse(profile);
  }

  /**
   * Updates permitted profile fields for the authenticated physician.
   * Enforces that doctors cannot modify verification status, public ID, or registration number directly.
   */
  public async updateSelfProfile(
    userId: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorSelfResponseDto> {
    const existing = await this.repository.findByUserId(userId);
    if (!existing) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const updated = await this.repository.updateProfile(existing.id, {
      displayName: dto.displayName ? dto.displayName.trim() : undefined,
      bio: dto.bio !== undefined ? dto.bio.trim() : undefined,
      yearsOfExperience: dto.yearsOfExperience,
      defaultConsultationFee: dto.defaultConsultationFee,
      currency: dto.currency,
      specialties: dto.specialties
        ? dto.specialties.map((s) => ({
            specialtyId: s.specialtyId,
            isPrimary: s.isPrimary ?? false,
          }))
        : undefined,
      languages: dto.languages
        ? dto.languages.map((l) => ({
            languageId: l.languageId,
          }))
        : undefined,
      qualifications: dto.qualifications
        ? dto.qualifications.map((q) => ({
            qualification: q.qualification.trim(),
            institution: q.institution.trim(),
            fieldOfStudy: q.fieldOfStudy?.trim() ?? null,
            graduationYear: q.graduationYear ?? null,
          }))
        : undefined,
    });

    return this.mapToSelfResponse(updated);
  }

  /**
   * Retrieves a doctor's public-facing profile by either publicDoctorId (DOC-XXXXXXXX) or UUID.
   * Internal identifiers and sensitive credential numbers are strictly stripped.
   */
  public async getPublicDoctorById(identifier: string): Promise<DoctorPublicResponseDto> {
    const isPublicId = identifier.startsWith('DOC-');
    const profile = isPublicId
      ? await this.repository.findByPublicId(identifier)
      : await this.repository.findById(identifier);

    if (!profile) {
      throw new NotFoundError(`Doctor not found with identifier '${identifier}'`);
    }

    return this.mapToPublicResponse(profile);
  }

  /**
   * Searches/lists public doctor profiles according to filter criteria (specialty, language).
   */
  public async searchPublicDoctors(query: DoctorQueryDto): Promise<{
    data: DoctorPublicResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const { doctors, total } = await this.repository.findPublicDoctors({
      specialty: query.specialty,
      language: query.language,
      limit,
      offset,
    });

    return {
      data: doctors.map((doc) => this.mapToPublicResponse(doc)),
      total,
      limit,
      offset,
    };
  }

  // ----------------------------------------------------------------------------
  // DTO Mappings
  // ----------------------------------------------------------------------------

  public mapToSelfResponse(entity: DoctorProfileEntity): DoctorSelfResponseDto {
    return {
      id: entity.id,
      userId: entity.userId,
      publicDoctorId: entity.publicDoctorId,
      displayName: entity.displayName,
      bio: entity.bio ?? null,
      medicalRegistrationNumber: entity.medicalRegistrationNumber,
      licensingCouncil: entity.licensingCouncil,
      yearsOfExperience: entity.yearsOfExperience,
      verificationStatus: entity.verificationStatus,
      defaultConsultationFee: entity.defaultConsultationFee,
      currency: entity.currency,
      verifiedAt: entity.verifiedAt ? entity.verifiedAt.toISOString() : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      specialties: entity.specialties.map((s) => ({
        id: s.id,
        specialtyId: s.specialtyId,
        code: s.specialty?.code ?? '',
        name: s.specialty?.name ?? '',
        isPrimary: s.isPrimary,
      })),
      languages: entity.languages.map((l) => ({
        id: l.id,
        languageId: l.languageId,
        code: l.language?.code ?? '',
        name: l.language?.name ?? '',
      })),
      qualifications: entity.qualifications.map((q) => ({
        id: q.id,
        qualification: q.qualification,
        institution: q.institution,
        fieldOfStudy: q.fieldOfStudy ?? null,
        graduationYear: q.graduationYear ?? null,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
    };
  }

  public mapToPublicResponse(entity: DoctorProfileEntity): DoctorPublicResponseDto {
    const primarySpecialtyObj =
      entity.specialties.find((s) => s.isPrimary) ?? entity.specialties[0];
    const primarySpecialty = primarySpecialtyObj?.specialty?.name ?? null;

    const subSpecialties = entity.specialties
      .filter((s) => s !== primarySpecialtyObj && s.specialty)
      .map((s) => s.specialty!.name);

    const languages = entity.languages.filter((l) => l.language).map((l) => l.language!.name);

    return {
      publicDoctorId: entity.publicDoctorId,
      displayName: entity.displayName,
      bio: entity.bio ?? null,
      primarySpecialty,
      subSpecialties,
      languages,
      yearsOfExperience: entity.yearsOfExperience,
      defaultConsultationFee: entity.defaultConsultationFee,
      currency: entity.currency,
      verificationStatus: entity.verificationStatus,
      qualifications: entity.qualifications.map((q) => ({
        qualification: q.qualification,
        institution: q.institution,
        fieldOfStudy: q.fieldOfStudy ?? null,
        graduationYear: q.graduationYear ?? null,
      })),
    };
  }
}
