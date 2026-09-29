import { Injectable, Optional } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { ICareRelationshipRepository } from '../interfaces/care-relationship-repository.interface.js';
import type {
  CareRelationshipEntity,
  ConsentEntity,
  ConsentHistoryEntity,
  PatientProfileEntity,
} from '../entities/index.js';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';
import { ConsentScope } from '../enums/consent-scope.enum.js';
import { ConsentAction } from '../enums/consent-action.enum.js';

interface RawPatientProfile {
  id: string;
  userId: string;
  publicPatientId: string;
  legalFirstName: string;
  legalLastName: string;
  displayName: string | null;
  dateOfBirth: string | Date | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawCareRelationship {
  id: string;
  patientId: string;
  doctorId: string;
  status: string;
  establishedAt: string | Date | null;
  terminatedAt: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawConsent {
  id: string;
  patientId: string;
  doctorId: string;
  careRelationshipId: string | null;
  scope: string;
  status: string;
  purpose: string | null;
  grantedAt: string | Date;
  expiresAt: string | Date | null;
  revokedAt: string | Date | null;
  revokedBy: string | null;
  revocationReason: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawConsentHistory {
  id: string;
  consentId: string;
  action: string;
  actorId: string;
  actorRole: string;
  reason: string | null;
  metadata: string | null;
  createdAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  delete?(args: { where: Record<string, unknown> }): Promise<T>;
}

interface PrismaClientLike {
  patientProfile: PrismaModelDelegate<RawPatientProfile>;
  careRelationship: PrismaModelDelegate<RawCareRelationship>;
  consent: PrismaModelDelegate<RawConsent>;
  consentHistory: PrismaModelDelegate<RawConsentHistory>;
}

@Injectable()
export class PrismaCareRelationshipRepository implements ICareRelationshipRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(@Optional() prisma?: PrismaClientLike | undefined) {
    this.prisma = prisma;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaCareRelationshipRepository. Provide a valid Prisma client or use InMemoryCareRelationshipRepository.',
      );
    }
    return this.prisma;
  }

  // --------------------------------------------------------------------------
  // Patient Profile
  // --------------------------------------------------------------------------
  public async createPatientProfile(
    userId: string,
    data: {
      publicPatientId: string;
      legalFirstName: string;
      legalLastName: string;
      displayName?: string | null;
      dateOfBirth?: Date | null;
      gender?: string | null;
      emergencyContactName?: string | null;
      emergencyContactPhone?: string | null;
    },
  ): Promise<PatientProfileEntity> {
    const raw = await this.getClient().patientProfile.create({
      data: {
        userId,
        publicPatientId: data.publicPatientId,
        legalFirstName: data.legalFirstName,
        legalLastName: data.legalLastName,
        displayName: data.displayName ?? null,
        dateOfBirth: data.dateOfBirth ?? null,
        gender: data.gender ?? null,
        emergencyContactName: data.emergencyContactName ?? null,
        emergencyContactPhone: data.emergencyContactPhone ?? null,
      },
    });
    return this.mapPatient(raw);
  }

  public async findPatientByUserId(userId: string): Promise<PatientProfileEntity | null> {
    const raw = await this.getClient().patientProfile.findUnique({
      where: { userId },
    });
    return raw ? this.mapPatient(raw) : null;
  }

  public async findPatientById(id: string): Promise<PatientProfileEntity | null> {
    const raw = await this.getClient().patientProfile.findUnique({
      where: { id },
    });
    return raw ? this.mapPatient(raw) : null;
  }

  public async findPatientByPublicId(publicId: string): Promise<PatientProfileEntity | null> {
    const raw = await this.getClient().patientProfile.findUnique({
      where: { publicPatientId: publicId },
    });
    return raw ? this.mapPatient(raw) : null;
  }

  // --------------------------------------------------------------------------
  // Care Relationship
  // --------------------------------------------------------------------------
  public async createCareRelationship(data: {
    patientId: string;
    doctorId: string;
    status?: CareRelationshipStatus;
    notes?: string | null;
    establishedAt?: Date | null;
  }): Promise<CareRelationshipEntity> {
    const raw = await this.getClient().careRelationship.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        status: data.status ?? CareRelationshipStatus.ACTIVE,
        establishedAt: data.establishedAt ?? new Date(),
        notes: data.notes ?? null,
      },
    });
    return this.mapCareRelationship(raw);
  }

  public async findCareRelationshipById(id: string): Promise<CareRelationshipEntity | null> {
    const raw = await this.getClient().careRelationship.findUnique({
      where: { id },
    });
    return raw ? this.mapCareRelationship(raw) : null;
  }

  public async findCareRelationship(
    patientId: string,
    doctorId: string,
  ): Promise<CareRelationshipEntity | null> {
    const delegate = this.getClient().careRelationship;
    if (delegate.findFirst) {
      const raw = await delegate.findFirst({
        where: { patientId, doctorId },
      });
      return raw ? this.mapCareRelationship(raw) : null;
    }
    const all = await delegate.findMany({
      where: { patientId, doctorId },
    });
    return all.length > 0 ? this.mapCareRelationship(all[0]!) : null;
  }

  public async findCareRelationshipsByPatientId(
    patientId: string,
    activeOnly = false,
  ): Promise<CareRelationshipEntity[]> {
    const where: Record<string, unknown> = { patientId };
    if (activeOnly) {
      where.status = CareRelationshipStatus.ACTIVE;
    }
    const raws = await this.getClient().careRelationship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map((r) => this.mapCareRelationship(r));
  }

  public async findCareRelationshipsByDoctorId(
    doctorId: string,
    activeOnly = false,
  ): Promise<CareRelationshipEntity[]> {
    const where: Record<string, unknown> = { doctorId };
    if (activeOnly) {
      where.status = CareRelationshipStatus.ACTIVE;
    }
    const raws = await this.getClient().careRelationship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map((r) => this.mapCareRelationship(r));
  }

  public async updateCareRelationship(
    id: string,
    data: Partial<CareRelationshipEntity>,
  ): Promise<CareRelationshipEntity> {
    try {
      const raw = await this.getClient().careRelationship.update({
        where: { id },
        data: {
          status: data.status,
          establishedAt: data.establishedAt,
          terminatedAt: data.terminatedAt,
          notes: data.notes,
        },
      });
      return this.mapCareRelationship(raw);
    } catch {
      throw new NotFoundError(`Care relationship '${id}' not found`);
    }
  }

  // --------------------------------------------------------------------------
  // Consent
  // --------------------------------------------------------------------------
  public async createConsent(data: {
    patientId: string;
    doctorId: string;
    careRelationshipId?: string | null;
    scope: ConsentScope;
    purpose?: string | null;
    expiresAt?: Date | null;
    status?: ConsentStatus;
  }): Promise<ConsentEntity> {
    const raw = await this.getClient().consent.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        careRelationshipId: data.careRelationshipId ?? null,
        scope: data.scope,
        purpose: data.purpose ?? null,
        expiresAt: data.expiresAt ?? null,
        status: data.status ?? ConsentStatus.ACTIVE,
      },
    });
    return this.mapConsent(raw);
  }

  public async findConsentById(id: string): Promise<ConsentEntity | null> {
    const raw = await this.getClient().consent.findUnique({
      where: { id },
    });
    return raw ? this.mapConsent(raw) : null;
  }

  public async findConsentsByPatientId(
    patientId: string,
    activeOnly = false,
  ): Promise<ConsentEntity[]> {
    const where: Record<string, unknown> = { patientId };
    if (activeOnly) {
      where.status = ConsentStatus.ACTIVE;
    }
    const raws = await this.getClient().consent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map((c) => this.mapConsent(c));
  }

  public async findConsentsByDoctorId(
    doctorId: string,
    patientId?: string,
    activeOnly = false,
  ): Promise<ConsentEntity[]> {
    const where: Record<string, unknown> = { doctorId };
    if (patientId) {
      where.patientId = patientId;
    }
    if (activeOnly) {
      where.status = ConsentStatus.ACTIVE;
    }
    const raws = await this.getClient().consent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return raws.map((c) => this.mapConsent(c));
  }

  public async findActiveConsent(
    patientId: string,
    doctorId: string,
    scope: ConsentScope,
  ): Promise<ConsentEntity | null> {
    const delegate = this.getClient().consent;
    const where = {
      patientId,
      doctorId,
      scope,
      status: ConsentStatus.ACTIVE,
      revokedAt: null,
    };
    if (delegate.findFirst) {
      const raw = await delegate.findFirst({ where });
      return raw ? this.mapConsent(raw) : null;
    }
    const raws = await delegate.findMany({ where });
    return raws.length > 0 ? this.mapConsent(raws[0]!) : null;
  }

  public async updateConsent(id: string, data: Partial<ConsentEntity>): Promise<ConsentEntity> {
    try {
      const raw = await this.getClient().consent.update({
        where: { id },
        data: {
          status: data.status,
          revokedAt: data.revokedAt,
          revokedBy: data.revokedBy,
          revocationReason: data.revocationReason,
          expiresAt: data.expiresAt,
        },
      });
      return this.mapConsent(raw);
    } catch {
      throw new NotFoundError(`Consent '${id}' not found`);
    }
  }

  // --------------------------------------------------------------------------
  // Consent History
  // --------------------------------------------------------------------------
  public async addConsentHistory(data: {
    consentId: string;
    action: ConsentAction;
    actorId: string;
    actorRole: string;
    reason?: string | null;
    metadata?: string | null;
  }): Promise<ConsentHistoryEntity> {
    const raw = await this.getClient().consentHistory.create({
      data: {
        consentId: data.consentId,
        action: data.action,
        actorId: data.actorId,
        actorRole: data.actorRole,
        reason: data.reason ?? null,
        metadata: data.metadata ?? null,
      },
    });
    return this.mapConsentHistory(raw);
  }

  public async getConsentHistory(consentId: string): Promise<ConsentHistoryEntity[]> {
    const raws = await this.getClient().consentHistory.findMany({
      where: { consentId },
      orderBy: { createdAt: 'asc' },
    });
    return raws.map((h) => this.mapConsentHistory(h));
  }

  // --------------------------------------------------------------------------
  // Mappers
  // --------------------------------------------------------------------------
  private mapPatient(r: RawPatientProfile): PatientProfileEntity {
    return {
      id: r.id,
      userId: r.userId,
      publicPatientId: r.publicPatientId,
      legalFirstName: r.legalFirstName,
      legalLastName: r.legalLastName,
      displayName: r.displayName,
      dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth) : null,
      gender: r.gender,
      emergencyContactName: r.emergencyContactName,
      emergencyContactPhone: r.emergencyContactPhone,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    };
  }

  private mapCareRelationship(r: RawCareRelationship): CareRelationshipEntity {
    return {
      id: r.id,
      patientId: r.patientId,
      doctorId: r.doctorId,
      status: r.status as CareRelationshipStatus,
      establishedAt: r.establishedAt ? new Date(r.establishedAt) : null,
      terminatedAt: r.terminatedAt ? new Date(r.terminatedAt) : null,
      notes: r.notes,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    };
  }

  private mapConsent(r: RawConsent): ConsentEntity {
    return {
      id: r.id,
      patientId: r.patientId,
      doctorId: r.doctorId,
      careRelationshipId: r.careRelationshipId,
      scope: r.scope as ConsentScope,
      status: r.status as ConsentStatus,
      purpose: r.purpose,
      grantedAt: new Date(r.grantedAt),
      expiresAt: r.expiresAt ? new Date(r.expiresAt) : null,
      revokedAt: r.revokedAt ? new Date(r.revokedAt) : null,
      revokedBy: r.revokedBy,
      revocationReason: r.revocationReason,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    };
  }

  private mapConsentHistory(r: RawConsentHistory): ConsentHistoryEntity {
    return {
      id: r.id,
      consentId: r.consentId,
      action: r.action as ConsentAction,
      actorId: r.actorId,
      actorRole: r.actorRole,
      reason: r.reason,
      metadata: r.metadata,
      createdAt: new Date(r.createdAt),
    };
  }
}
