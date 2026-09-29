import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import type { ICareRelationshipRepository } from '../interfaces/care-relationship-repository.interface.js';
import type {
  CareRelationshipEntity,
  ConsentEntity,
  ConsentHistoryEntity,
  PatientProfileEntity,
} from '../entities/index.js';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';
import type { ConsentScope } from '../enums/consent-scope.enum.js';
import type { ConsentAction } from '../enums/consent-action.enum.js';

@Injectable()
export class InMemoryCareRelationshipRepository implements ICareRelationshipRepository {
  private readonly patients = new Map<string, PatientProfileEntity>();
  private readonly relationships = new Map<string, CareRelationshipEntity>();
  private readonly consents = new Map<string, ConsentEntity>();
  private readonly histories: ConsentHistoryEntity[] = [];

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
    const profile: PatientProfileEntity = {
      id: crypto.randomUUID(),
      userId,
      publicPatientId: data.publicPatientId,
      legalFirstName: data.legalFirstName,
      legalLastName: data.legalLastName,
      displayName: data.displayName ?? null,
      dateOfBirth: data.dateOfBirth ?? null,
      gender: data.gender ?? null,
      emergencyContactName: data.emergencyContactName ?? null,
      emergencyContactPhone: data.emergencyContactPhone ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.patients.set(profile.id, profile);
    return { ...profile };
  }

  public async findPatientByUserId(userId: string): Promise<PatientProfileEntity | null> {
    for (const p of this.patients.values()) {
      if (p.userId === userId) {
        return { ...p };
      }
    }
    return null;
  }

  public async findPatientById(id: string): Promise<PatientProfileEntity | null> {
    const p = this.patients.get(id);
    return p ? { ...p } : null;
  }

  public async findPatientByPublicId(publicId: string): Promise<PatientProfileEntity | null> {
    for (const p of this.patients.values()) {
      if (p.publicPatientId === publicId) {
        return { ...p };
      }
    }
    return null;
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
    const rel: CareRelationshipEntity = {
      id: crypto.randomUUID(),
      patientId: data.patientId,
      doctorId: data.doctorId,
      status: data.status ?? CareRelationshipStatus.ACTIVE,
      establishedAt: data.establishedAt ?? new Date(),
      terminatedAt: null,
      notes: data.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.relationships.set(rel.id, rel);
    return { ...rel };
  }

  public async findCareRelationshipById(id: string): Promise<CareRelationshipEntity | null> {
    const r = this.relationships.get(id);
    return r ? { ...r } : null;
  }

  public async findCareRelationship(
    patientId: string,
    doctorId: string,
  ): Promise<CareRelationshipEntity | null> {
    for (const r of this.relationships.values()) {
      if (r.patientId === patientId && r.doctorId === doctorId) {
        return { ...r };
      }
    }
    return null;
  }

  public async findCareRelationshipsByPatientId(
    patientId: string,
    activeOnly = false,
  ): Promise<CareRelationshipEntity[]> {
    return Array.from(this.relationships.values())
      .filter(
        (r) =>
          r.patientId === patientId && (!activeOnly || r.status === CareRelationshipStatus.ACTIVE),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findCareRelationshipsByDoctorId(
    doctorId: string,
    activeOnly = false,
  ): Promise<CareRelationshipEntity[]> {
    return Array.from(this.relationships.values())
      .filter(
        (r) =>
          r.doctorId === doctorId && (!activeOnly || r.status === CareRelationshipStatus.ACTIVE),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async updateCareRelationship(
    id: string,
    data: Partial<CareRelationshipEntity>,
  ): Promise<CareRelationshipEntity> {
    const existing = this.relationships.get(id);
    if (!existing) {
      throw new Error(`Care relationship '${id}' not found`);
    }

    const updated: CareRelationshipEntity = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.relationships.set(id, updated);
    return { ...updated };
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
    const consent: ConsentEntity = {
      id: crypto.randomUUID(),
      patientId: data.patientId,
      doctorId: data.doctorId,
      careRelationshipId: data.careRelationshipId ?? null,
      scope: data.scope,
      status: data.status ?? ConsentStatus.ACTIVE,
      purpose: data.purpose ?? null,
      grantedAt: new Date(),
      expiresAt: data.expiresAt ?? null,
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.consents.set(consent.id, consent);
    return { ...consent };
  }

  public async findConsentById(id: string): Promise<ConsentEntity | null> {
    const c = this.consents.get(id);
    return c ? { ...c } : null;
  }

  public async findConsentsByPatientId(
    patientId: string,
    activeOnly = false,
  ): Promise<ConsentEntity[]> {
    return Array.from(this.consents.values())
      .filter(
        (c) => c.patientId === patientId && (!activeOnly || c.status === ConsentStatus.ACTIVE),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findConsentsByDoctorId(
    doctorId: string,
    patientId?: string,
    activeOnly = false,
  ): Promise<ConsentEntity[]> {
    return Array.from(this.consents.values())
      .filter(
        (c) =>
          c.doctorId === doctorId &&
          (!patientId || c.patientId === patientId) &&
          (!activeOnly || c.status === ConsentStatus.ACTIVE),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async findActiveConsent(
    patientId: string,
    doctorId: string,
    scope: ConsentScope,
  ): Promise<ConsentEntity | null> {
    for (const c of this.consents.values()) {
      if (
        c.patientId === patientId &&
        c.doctorId === doctorId &&
        c.scope === scope &&
        c.status === ConsentStatus.ACTIVE &&
        !c.revokedAt
      ) {
        return { ...c };
      }
    }
    return null;
  }

  public async updateConsent(id: string, data: Partial<ConsentEntity>): Promise<ConsentEntity> {
    const existing = this.consents.get(id);
    if (!existing) {
      throw new Error(`Consent '${id}' not found`);
    }

    const updated: ConsentEntity = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.consents.set(id, updated);
    return { ...updated };
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
    const history: ConsentHistoryEntity = {
      id: crypto.randomUUID(),
      consentId: data.consentId,
      action: data.action,
      actorId: data.actorId,
      actorRole: data.actorRole,
      reason: data.reason ?? null,
      metadata: data.metadata ?? null,
      createdAt: new Date(),
    };
    this.histories.push(history);
    return { ...history };
  }

  public async getConsentHistory(consentId: string): Promise<ConsentHistoryEntity[]> {
    return this.histories
      .filter((h) => h.consentId === consentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}
