import { Injectable, Optional } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../../common/errors/app-error.js';
import { VerificationStatus } from '../enums/verification-status.enum.js';
import type { DoctorProfileEntity } from '../entities/doctor-profile.entity.js';
import type { SpecialtyEntity } from '../entities/specialty.entity.js';
import type { LanguageEntity } from '../entities/language.entity.js';
import type {
  IDoctorsRepository,
  DoctorFilterCriteria,
  CreateDoctorProfileData,
  UpdateDoctorProfileData,
} from '../interfaces/doctor-repository.interface.js';

interface RawSpecialty {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawLanguage {
  id: string;
  code: string;
  name: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawDoctorSpecialty {
  id: string;
  doctorId: string;
  specialtyId: string;
  isPrimary: boolean;
  specialty?: RawSpecialty;
  createdAt: string | Date;
}

interface RawDoctorLanguage {
  id: string;
  doctorId: string;
  languageId: string;
  language?: RawLanguage;
  createdAt: string | Date;
}

interface RawDoctorQualification {
  id: string;
  doctorId: string;
  qualification: string;
  institution: string;
  fieldOfStudy: string | null;
  graduationYear: number | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawDoctorProfile {
  id: string;
  userId: string;
  publicDoctorId: string;
  displayName: string;
  bio: string | null;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience: number;
  verificationStatus: string;
  defaultConsultationFee: string | number;
  currency: string;
  verifiedAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  specialties?: RawDoctorSpecialty[];
  languages?: RawDoctorLanguage[];
  qualifications?: RawDoctorQualification[];
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<T>;
  findUnique(args: {
    where: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
    include?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<T[]>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
}

export interface PrismaClientLike {
  doctorProfile: PrismaModelDelegate<RawDoctorProfile>;
  specialty: PrismaModelDelegate<RawSpecialty>;
  language: PrismaModelDelegate<RawLanguage>;
  doctorSpecialty: PrismaModelDelegate<RawDoctorSpecialty>;
  doctorLanguage: PrismaModelDelegate<RawDoctorLanguage>;
  doctorQualification: PrismaModelDelegate<RawDoctorQualification>;
  $transaction<R>(fn: (tx: PrismaClientLike) => Promise<R>): Promise<R>;
}

@Injectable()
export class PrismaDoctorsRepository implements IDoctorsRepository {
  private readonly prisma: PrismaClientLike;

  constructor(@Optional() prismaClient?: PrismaClientLike) {
    this.prisma = prismaClient ?? (null as unknown as PrismaClientLike);
  }

  public async createProfile(data: CreateDoctorProfileData): Promise<DoctorProfileEntity> {
    this.ensurePrismaClient();

    try {
      const created = await this.prisma.doctorProfile.create({
        data: {
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
          specialties: data.specialties
            ? {
                create: data.specialties.map((s) => ({
                  specialtyId: s.specialtyId,
                  isPrimary: s.isPrimary ?? false,
                })),
              }
            : undefined,
          languages: data.languages
            ? {
                create: data.languages.map((l) => ({
                  languageId: l.languageId,
                })),
              }
            : undefined,
          qualifications: data.qualifications
            ? {
                create: data.qualifications.map((q) => ({
                  qualification: q.qualification,
                  institution: q.institution,
                  fieldOfStudy: q.fieldOfStudy ?? null,
                  graduationYear: q.graduationYear ?? null,
                })),
              }
            : undefined,
        },
        include: {
          specialties: { include: { specialty: true } },
          languages: { include: { language: true } },
          qualifications: true,
        },
      });

      return this.mapToEntity(created);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        const meta = (error as { meta?: { target?: string[] } }).meta;
        const target = meta?.target?.join(', ') ?? '';
        if (target.includes('user_id')) {
          throw new ConflictError('A doctor profile already exists for this user account');
        }
        if (target.includes('medical_registration_number')) {
          throw new ConflictError('Medical registration number is already registered');
        }
        if (target.includes('public_doctor_id')) {
          throw new ConflictError('Public doctor ID collision detected');
        }
        throw new ConflictError('Unique constraint violation on doctor profile');
      }
      throw error;
    }
  }

  public async findById(id: string): Promise<DoctorProfileEntity | null> {
    this.ensurePrismaClient();

    const profile = await this.prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        specialties: { include: { specialty: true } },
        languages: { include: { language: true } },
        qualifications: true,
      },
    });
    return profile ? this.mapToEntity(profile) : null;
  }

  public async findByUserId(userId: string): Promise<DoctorProfileEntity | null> {
    this.ensurePrismaClient();

    const profile = await this.prisma.doctorProfile.findUnique({
      where: { userId },
      include: {
        specialties: { include: { specialty: true } },
        languages: { include: { language: true } },
        qualifications: true,
      },
    });
    return profile ? this.mapToEntity(profile) : null;
  }

  public async findByPublicId(publicDoctorId: string): Promise<DoctorProfileEntity | null> {
    this.ensurePrismaClient();

    const profile = await this.prisma.doctorProfile.findUnique({
      where: { publicDoctorId },
      include: {
        specialties: { include: { specialty: true } },
        languages: { include: { language: true } },
        qualifications: true,
      },
    });
    return profile ? this.mapToEntity(profile) : null;
  }

  public async findByRegistrationNumber(
    medicalRegistrationNumber: string,
  ): Promise<DoctorProfileEntity | null> {
    this.ensurePrismaClient();

    const profile = await this.prisma.doctorProfile.findUnique({
      where: { medicalRegistrationNumber },
      include: {
        specialties: { include: { specialty: true } },
        languages: { include: { language: true } },
        qualifications: true,
      },
    });
    return profile ? this.mapToEntity(profile) : null;
  }

  public async updateProfile(
    id: string,
    data: UpdateDoctorProfileData,
  ): Promise<DoctorProfileEntity> {
    this.ensurePrismaClient();

    const existing = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Doctor profile with ID '${id}' not found`);
    }

    const updated = await this.prisma.$transaction(async (tx: PrismaClientLike) => {
      if (data.specialties) {
        await tx.doctorSpecialty.deleteMany({ where: { doctorId: id } });
        await tx.doctorSpecialty.createMany({
          data: data.specialties.map((s) => ({
            doctorId: id,
            specialtyId: s.specialtyId,
            isPrimary: s.isPrimary ?? false,
          })),
        });
      }

      if (data.languages) {
        await tx.doctorLanguage.deleteMany({ where: { doctorId: id } });
        await tx.doctorLanguage.createMany({
          data: data.languages.map((l) => ({
            doctorId: id,
            languageId: l.languageId,
          })),
        });
      }

      if (data.qualifications) {
        await tx.doctorQualification.deleteMany({ where: { doctorId: id } });
        await tx.doctorQualification.createMany({
          data: data.qualifications.map((q) => ({
            doctorId: id,
            qualification: q.qualification,
            institution: q.institution,
            fieldOfStudy: q.fieldOfStudy ?? null,
            graduationYear: q.graduationYear ?? null,
          })),
        });
      }

      return tx.doctorProfile.update({
        where: { id },
        data: {
          displayName: data.displayName,
          bio: data.bio,
          yearsOfExperience: data.yearsOfExperience,
          defaultConsultationFee: data.defaultConsultationFee,
          currency: data.currency,
        },
        include: {
          specialties: { include: { specialty: true } },
          languages: { include: { language: true } },
          qualifications: true,
        },
      });
    });

    return this.mapToEntity(updated);
  }

  public async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    verifiedAt?: Date | null | undefined,
  ): Promise<DoctorProfileEntity> {
    this.ensurePrismaClient();

    const existing = await this.prisma.doctorProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Doctor profile with ID '${id}' not found`);
    }

    const updated = await this.prisma.doctorProfile.update({
      where: { id },
      data: {
        verificationStatus: status,
        ...(verifiedAt !== undefined ? { verifiedAt } : {}),
      },
      include: {
        specialties: { include: { specialty: true } },
        languages: { include: { language: true } },
        qualifications: true,
      },
    });

    return this.mapToEntity(updated);
  }

  public async findPublicDoctors(
    criteria: DoctorFilterCriteria,
  ): Promise<{ doctors: DoctorProfileEntity[]; total: number }> {
    this.ensurePrismaClient();

    const where: Record<string, unknown> = {};

    if (criteria.specialty) {
      where.specialties = {
        some: {
          specialty: {
            OR: [
              { code: { equals: criteria.specialty, mode: 'insensitive' } },
              { name: { contains: criteria.specialty, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    if (criteria.language) {
      where.languages = {
        some: {
          language: {
            OR: [
              { code: { equals: criteria.language, mode: 'insensitive' } },
              { name: { contains: criteria.language, mode: 'insensitive' } },
            ],
          },
        },
      };
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        skip: criteria.offset ?? 0,
        take: criteria.limit ?? 20,
        include: {
          specialties: { include: { specialty: true } },
          languages: { include: { language: true } },
          qualifications: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return {
      doctors: doctors.map((d) => this.mapToEntity(d)),
      total,
    };
  }

  public async findActiveSpecialties(): Promise<SpecialtyEntity[]> {
    this.ensurePrismaClient();
    const list = await this.prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return list.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      isActive: s.isActive,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }));
  }

  public async findSpecialtyById(id: string): Promise<SpecialtyEntity | null> {
    this.ensurePrismaClient();
    const s = await this.prisma.specialty.findUnique({ where: { id } });
    return s
      ? {
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description,
          isActive: s.isActive,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }
      : null;
  }

  public async findSpecialtyByCode(code: string): Promise<SpecialtyEntity | null> {
    this.ensurePrismaClient();
    const s = await this.prisma.specialty.findUnique({ where: { code } });
    return s
      ? {
          id: s.id,
          code: s.code,
          name: s.name,
          description: s.description,
          isActive: s.isActive,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
        }
      : null;
  }

  public async findAllLanguages(): Promise<LanguageEntity[]> {
    this.ensurePrismaClient();
    const list = await this.prisma.language.findMany({
      orderBy: { name: 'asc' },
    });
    return list.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      createdAt: new Date(l.createdAt),
      updatedAt: new Date(l.updatedAt),
    }));
  }

  public async findLanguageById(id: string): Promise<LanguageEntity | null> {
    this.ensurePrismaClient();
    const l = await this.prisma.language.findUnique({ where: { id } });
    return l
      ? {
          id: l.id,
          code: l.code,
          name: l.name,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }
      : null;
  }

  public async findLanguageByCode(code: string): Promise<LanguageEntity | null> {
    this.ensurePrismaClient();
    const l = await this.prisma.language.findUnique({ where: { code } });
    return l
      ? {
          id: l.id,
          code: l.code,
          name: l.name,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
        }
      : null;
  }

  private ensurePrismaClient(): void {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient instance not available. Connect database in Phase 3 or configure a valid client.',
      );
    }
  }

  private mapToEntity(record: RawDoctorProfile): DoctorProfileEntity {
    return {
      id: record.id,
      userId: record.userId,
      publicDoctorId: record.publicDoctorId,
      displayName: record.displayName,
      bio: record.bio ?? null,
      medicalRegistrationNumber: record.medicalRegistrationNumber,
      licensingCouncil: record.licensingCouncil,
      yearsOfExperience: record.yearsOfExperience,
      verificationStatus: record.verificationStatus as VerificationStatus,
      defaultConsultationFee: Number(record.defaultConsultationFee),
      currency: record.currency,
      verifiedAt: record.verifiedAt ? new Date(record.verifiedAt) : null,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      specialties: (record.specialties ?? []).map((s) => ({
        id: s.id,
        doctorId: s.doctorId,
        specialtyId: s.specialtyId,
        isPrimary: s.isPrimary,
        specialty: s.specialty
          ? {
              id: s.specialty.id,
              code: s.specialty.code,
              name: s.specialty.name,
              description: s.specialty.description,
              isActive: s.specialty.isActive,
              createdAt: new Date(s.specialty.createdAt),
              updatedAt: new Date(s.specialty.updatedAt),
            }
          : undefined,
        createdAt: new Date(s.createdAt),
      })),
      languages: (record.languages ?? []).map((l) => ({
        id: l.id,
        doctorId: l.doctorId,
        languageId: l.languageId,
        language: l.language
          ? {
              id: l.language.id,
              code: l.language.code,
              name: l.language.name,
              createdAt: new Date(l.language.createdAt),
              updatedAt: new Date(l.language.updatedAt),
            }
          : undefined,
        createdAt: new Date(l.createdAt),
      })),
      qualifications: (record.qualifications ?? []).map((q) => ({
        id: q.id,
        doctorId: q.doctorId,
        qualification: q.qualification,
        institution: q.institution,
        fieldOfStudy: q.fieldOfStudy ?? null,
        graduationYear: q.graduationYear ?? null,
        createdAt: new Date(q.createdAt),
        updatedAt: new Date(q.updatedAt),
      })),
    };
  }
}
