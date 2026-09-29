import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import {
  CARE_RELATIONSHIP_REPOSITORY,
  type ICareRelationshipRepository,
} from '../interfaces/care-relationship-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import {
  CONSENT_AUDIT_SERVICE,
  type IConsentAuditService,
} from '../interfaces/consent-audit-service.interface.js';
import {
  RESOURCE_AUTHORIZATION_SERVICE,
  type IResourceAuthorizationService,
} from '../interfaces/resource-authorization.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';
import { ConsentAction } from '../enums/consent-action.enum.js';
import { generatePublicPatientId } from '../utils/public-patient-id.util.js';
import type { GrantConsentDto } from '../dto/grant-consent.dto.js';
import type { RevokeConsentDto } from '../dto/revoke-consent.dto.js';
import type { ConsentResponseDto } from '../dto/consent-response.dto.js';
import type { ConsentHistoryResponseDto } from '../dto/consent-history-response.dto.js';
import type {
  ResourceAccessCheckQueryDto,
  ResourceAccessDecisionDto,
} from '../dto/resource-access-check.dto.js';
import type { ConsentEntity, PatientProfileEntity } from '../entities/index.js';

@Injectable()
export class ConsentsService {
  constructor(
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Inject(CONSENT_AUDIT_SERVICE)
    private readonly auditService: IConsentAuditService,
    @Inject(RESOURCE_AUTHORIZATION_SERVICE)
    private readonly authService: IResourceAuthorizationService,
  ) {}

  public async grantConsent(
    patientUserId: string,
    dto: GrantConsentDto,
  ): Promise<ConsentResponseDto[]> {
    const patient = await this.getOrCreatePatientProfile(patientUserId);

    // Resolve target doctor
    const doctor = dto.doctorId.startsWith('DOC-')
      ? await this.doctorsRepo.findByPublicId(dto.doctorId)
      : await this.doctorsRepo.findById(dto.doctorId);

    if (!doctor) {
      throw new NotFoundError(`Doctor '${dto.doctorId}' not found`);
    }

    // Authoritative verification rule: Doctors must be verified to receive patient consent
    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ValidationError('Consent cannot be granted to unverified or non-active doctors');
    }

    // Validate expiration if provided
    let expiresAtDate: Date | null = null;
    if (dto.expiresAt) {
      expiresAtDate = new Date(dto.expiresAt);
      if (isNaN(expiresAtDate.getTime()) || expiresAtDate <= new Date()) {
        throw new ValidationError('expiresAt must be a valid future timestamp');
      }
    }

    // Ensure active CareRelationship exists (auto-establish if needed)
    let relationship = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (!relationship) {
      relationship = await this.careRelRepo.createCareRelationship({
        patientId: patient.id,
        doctorId: doctor.id,
        status: CareRelationshipStatus.ACTIVE,
        establishedAt: new Date(),
        notes: 'Automatically established upon patient consent grant',
      });
    } else if (relationship.status !== CareRelationshipStatus.ACTIVE) {
      relationship = await this.careRelRepo.updateCareRelationship(relationship.id, {
        status: CareRelationshipStatus.ACTIVE,
        establishedAt: new Date(),
        terminatedAt: null,
      });
    }

    const createdDtos: ConsentResponseDto[] = [];

    // Grant each requested scope
    for (const scope of dto.scopes) {
      const existing = await this.careRelRepo.findActiveConsent(patient.id, doctor.id, scope);
      if (existing && this.isConsentEffective(existing)) {
        throw new ConflictError(
          `An active consent grant already exists for Dr. ${doctor.displayName} with scope '${scope}'`,
        );
      }

      const consent = await this.careRelRepo.createConsent({
        patientId: patient.id,
        doctorId: doctor.id,
        careRelationshipId: relationship.id,
        scope,
        purpose: dto.purpose?.trim() ?? null,
        expiresAt: expiresAtDate,
        status: ConsentStatus.ACTIVE,
      });

      // Immutable audit history event
      await this.careRelRepo.addConsentHistory({
        consentId: consent.id,
        action: ConsentAction.GRANTED,
        actorId: patientUserId,
        actorRole: 'PATIENT',
        reason: dto.purpose?.trim() ?? 'Patient explicit consent grant',
      });

      this.auditService.logEvent({
        event: 'CONSENT_GRANTED',
        actorId: patientUserId,
        role: 'PATIENT',
        resource: `CONSENT:${consent.id}`,
        action: 'GRANT_CONSENT',
        metadata: {
          patientId: patient.id,
          doctorId: doctor.id,
          scope,
          expiresAt: expiresAtDate?.toISOString(),
        },
      });

      createdDtos.push(
        this.mapToResponseDto(
          consent,
          patient.publicPatientId,
          doctor.publicDoctorId,
          doctor.displayName,
        ),
      );
    }

    return createdDtos;
  }

  public async revokeConsent(
    patientUserId: string,
    consentId: string,
    dto: RevokeConsentDto,
  ): Promise<ConsentResponseDto> {
    const patient = await this.getOrCreatePatientProfile(patientUserId);

    const consent = await this.careRelRepo.findConsentById(consentId);
    if (!consent) {
      throw new NotFoundError(`Consent record with ID '${consentId}' not found`);
    }

    // Ownership check: only the patient can revoke consent
    if (consent.patientId !== patient.id) {
      throw new ForbiddenError('Access denied: you can only revoke your own consent grants');
    }

    if (consent.status === ConsentStatus.REVOKED) {
      throw new ValidationError('This consent grant is already revoked');
    }

    const revoked = await this.careRelRepo.updateConsent(consent.id, {
      status: ConsentStatus.REVOKED,
      revokedAt: new Date(),
      revokedBy: patientUserId,
      revocationReason: dto.reason?.trim() ?? 'Revoked by patient',
    });

    // Immutable audit history
    await this.careRelRepo.addConsentHistory({
      consentId: consent.id,
      action: ConsentAction.REVOKED,
      actorId: patientUserId,
      actorRole: 'PATIENT',
      reason: dto.reason?.trim() ?? 'Revoked by patient',
    });

    this.auditService.logEvent({
      event: 'CONSENT_REVOKED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `CONSENT:${consent.id}`,
      action: 'REVOKE_CONSENT',
      metadata: {
        patientId: patient.id,
        doctorId: consent.doctorId,
        scope: consent.scope,
      },
    });

    const doctor = await this.doctorsRepo.findById(consent.doctorId);
    return this.mapToResponseDto(
      revoked,
      patient.publicPatientId,
      doctor?.publicDoctorId ?? 'UNKNOWN',
      doctor?.displayName ?? 'Physician',
    );
  }

  public async getPatientConsents(patientUserId: string): Promise<ConsentResponseDto[]> {
    const patient = await this.careRelRepo.findPatientByUserId(patientUserId);
    if (!patient) {
      return [];
    }

    const consents = await this.careRelRepo.findConsentsByPatientId(patient.id, false);
    const results: ConsentResponseDto[] = [];

    for (const c of consents) {
      const doctor = await this.doctorsRepo.findById(c.doctorId);
      if (doctor) {
        results.push(
          this.mapToResponseDto(
            c,
            patient.publicPatientId,
            doctor.publicDoctorId,
            doctor.displayName,
          ),
        );
      }
    }

    return results;
  }

  public async getConsentDetails(
    patientUserId: string,
    consentId: string,
  ): Promise<{ consent: ConsentResponseDto; history: ConsentHistoryResponseDto[] }> {
    const patient = await this.getOrCreatePatientProfile(patientUserId);

    const consent = await this.careRelRepo.findConsentById(consentId);
    if (!consent) {
      throw new NotFoundError(`Consent record with ID '${consentId}' not found`);
    }

    if (consent.patientId !== patient.id) {
      throw new ForbiddenError('Access denied: you can only view your own consent records');
    }

    const doctor = await this.doctorsRepo.findById(consent.doctorId);
    const history = await this.careRelRepo.getConsentHistory(consent.id);

    return {
      consent: this.mapToResponseDto(
        consent,
        patient.publicPatientId,
        doctor?.publicDoctorId ?? 'UNKNOWN',
        doctor?.displayName ?? 'Physician',
      ),
      history: history.map((h) => ({
        id: h.id,
        consentId: h.consentId,
        action: h.action,
        actorId: h.actorId,
        actorRole: h.actorRole,
        reason: h.reason,
        metadata: h.metadata,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  public async checkDoctorAccess(
    doctorUserId: string,
    query: ResourceAccessCheckQueryDto,
  ): Promise<ResourceAccessDecisionDto> {
    return this.authService.canAccessPatientResource({
      actorUserId: doctorUserId,
      actorRole: 'DOCTOR',
      patientId: query.patientId,
      resourceType: query.resourceType,
    });
  }

  private isConsentEffective(consent: ConsentEntity): boolean {
    if (consent.status !== ConsentStatus.ACTIVE) return false;
    if (consent.revokedAt) return false;
    if (consent.expiresAt && new Date() >= consent.expiresAt) return false;
    return true;
  }

  private async getOrCreatePatientProfile(userId: string): Promise<PatientProfileEntity> {
    const existing = await this.careRelRepo.findPatientByUserId(userId);
    if (existing) {
      return existing;
    }

    return this.careRelRepo.createPatientProfile(userId, {
      publicPatientId: generatePublicPatientId(),
      legalFirstName: 'Patient',
      legalLastName: 'User',
      displayName: 'Patient User',
    });
  }

  private mapToResponseDto(
    c: ConsentEntity,
    publicPatientId: string,
    publicDoctorId: string,
    doctorDisplayName: string,
  ): ConsentResponseDto {
    return {
      id: c.id,
      publicPatientId,
      publicDoctorId,
      doctorDisplayName,
      careRelationshipId: c.careRelationshipId,
      scope: c.scope,
      status: c.status,
      purpose: c.purpose,
      isCurrentlyActive: this.isConsentEffective(c),
      grantedAt: c.grantedAt.toISOString(),
      expiresAt: c.expiresAt?.toISOString() ?? null,
      revokedAt: c.revokedAt?.toISOString() ?? null,
      revocationReason: c.revocationReason,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
