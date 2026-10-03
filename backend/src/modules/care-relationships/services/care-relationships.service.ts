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
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';
import { ConsentAction } from '../enums/consent-action.enum.js';
import { generatePublicPatientId } from '../utils/public-patient-id.util.js';
import type { CreateCareRelationshipDto } from '../dto/create-care-relationship.dto.js';
import type { CareRelationshipResponseDto } from '../dto/care-relationship-response.dto.js';
import type { CareRelationshipEntity, PatientProfileEntity } from '../entities/index.js';

@Injectable()
export class CareRelationshipsService {
  constructor(
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Inject(CONSENT_AUDIT_SERVICE)
    private readonly auditService: IConsentAuditService,
  ) {}

  public async createCareRelationship(
    patientUserId: string,
    dto: CreateCareRelationshipDto,
  ): Promise<CareRelationshipResponseDto> {
    const patient = await this.getOrCreatePatientProfile(patientUserId);

    // Resolve target doctor by public ID or UUID
    const doctor = dto.doctorId.startsWith('DOC-')
      ? await this.doctorsRepo.findByPublicId(dto.doctorId)
      : await this.doctorsRepo.findById(dto.doctorId);

    if (!doctor) {
      throw new NotFoundError(`Doctor '${dto.doctorId}' not found`);
    }

    // Authoritative verification rule: Care relationships require verified physicians
    if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ValidationError(
        'Care relationships cannot be established with unverified or non-active doctors',
      );
    }

    // Check existing relationship
    const existing = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);
    if (existing && existing.status === CareRelationshipStatus.ACTIVE) {
      throw new ConflictError(
        `An active care relationship already exists with Dr. ${doctor.displayName}`,
      );
    }

    let relationship: CareRelationshipEntity;
    if (existing) {
      // Reactivate terminated/revoked relationship
      relationship = await this.careRelRepo.updateCareRelationship(existing.id, {
        status: CareRelationshipStatus.ACTIVE,
        establishedAt: new Date(),
        terminatedAt: null,
        notes: dto.notes?.trim() ?? existing.notes,
      });
    } else {
      relationship = await this.careRelRepo.createCareRelationship({
        patientId: patient.id,
        doctorId: doctor.id,
        status: CareRelationshipStatus.ACTIVE,
        establishedAt: new Date(),
        notes: dto.notes?.trim() ?? null,
      });
    }

    this.auditService.logEvent({
      event: 'CARE_RELATIONSHIP_CREATED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `CARE_RELATIONSHIP:${relationship.id}`,
      action: 'ESTABLISH_CARE_RELATIONSHIP',
      metadata: {
        patientId: patient.id,
        doctorId: doctor.id,
        publicDoctorId: doctor.publicDoctorId,
      },
    });

    return this.mapToResponseDto(
      relationship,
      patient.publicPatientId,
      doctor.publicDoctorId,
      doctor.displayName,
    );
  }

  public async getPatientCareRelationships(
    patientUserId: string,
  ): Promise<CareRelationshipResponseDto[]> {
    const patient = await this.careRelRepo.findPatientByUserId(patientUserId);
    if (!patient) {
      return [];
    }

    const relationships = await this.careRelRepo.findCareRelationshipsByPatientId(
      patient.id,
      false,
    );
    const results: CareRelationshipResponseDto[] = [];

    for (const rel of relationships) {
      const doctor = await this.doctorsRepo.findById(rel.doctorId);
      if (doctor) {
        results.push(
          this.mapToResponseDto(
            rel,
            patient.publicPatientId,
            doctor.publicDoctorId,
            doctor.displayName,
          ),
        );
      }
    }

    return results;
  }

  public async getDoctorCareRelationships(
    doctorUserId: string,
  ): Promise<CareRelationshipResponseDto[]> {
    const doctor = await this.doctorsRepo.findByUserId(doctorUserId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const relationships = await this.careRelRepo.findCareRelationshipsByDoctorId(doctor.id, false);
    const results: CareRelationshipResponseDto[] = [];

    for (const rel of relationships) {
      const patient = await this.careRelRepo.findPatientById(rel.patientId);
      if (patient) {
        results.push(
          this.mapToResponseDto(
            rel,
            patient.publicPatientId,
            doctor.publicDoctorId,
            doctor.displayName,
          ),
        );
      }
    }

    return results;
  }

  public async terminateCareRelationship(
    patientUserId: string,
    relationshipId: string,
  ): Promise<CareRelationshipResponseDto> {
    const patient = await this.getOrCreatePatientProfile(patientUserId);

    const relationship = await this.careRelRepo.findCareRelationshipById(relationshipId);
    if (!relationship) {
      throw new NotFoundError(`Care relationship with ID '${relationshipId}' not found`);
    }

    // Ownership check
    if (relationship.patientId !== patient.id) {
      throw new ForbiddenError('Access denied: you can only terminate your own care relationships');
    }

    const terminated = await this.careRelRepo.updateCareRelationship(relationship.id, {
      status: CareRelationshipStatus.TERMINATED,
      terminatedAt: new Date(),
    });

    // Revoke any active consents granted under this care relationship
    const activeConsents = await this.careRelRepo.findConsentsByPatientId(patient.id, true);
    for (const consent of activeConsents) {
      if (consent.doctorId === relationship.doctorId) {
        await this.careRelRepo.updateConsent(consent.id, {
          status: ConsentStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: patientUserId,
          revocationReason: 'Automatically revoked upon care relationship termination',
        });
        await this.careRelRepo.addConsentHistory({
          consentId: consent.id,
          action: ConsentAction.REVOKED,
          actorId: patientUserId,
          actorRole: 'PATIENT',
          reason: 'Care relationship terminated by patient',
        });
      }
    }

    this.auditService.logEvent({
      event: 'CARE_RELATIONSHIP_TERMINATED',
      actorId: patientUserId,
      role: 'PATIENT',
      resource: `CARE_RELATIONSHIP:${relationship.id}`,
      action: 'TERMINATE_CARE_RELATIONSHIP',
      metadata: {
        patientId: patient.id,
        doctorId: relationship.doctorId,
      },
    });

    const doctor = await this.doctorsRepo.findById(relationship.doctorId);
    return this.mapToResponseDto(
      terminated,
      patient.publicPatientId,
      doctor?.publicDoctorId ?? 'UNKNOWN',
      doctor?.displayName ?? 'Physician',
    );
  }

  public async getOrCreatePatientProfile(userId: string): Promise<PatientProfileEntity> {
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
    rel: CareRelationshipEntity,
    publicPatientId: string,
    publicDoctorId: string,
    doctorDisplayName: string,
  ): CareRelationshipResponseDto {
    return {
      id: rel.id,
      publicPatientId,
      publicDoctorId,
      doctorDisplayName,
      status: rel.status,
      establishedAt: rel.establishedAt?.toISOString() ?? null,
      terminatedAt: rel.terminatedAt?.toISOString() ?? null,
      notes: rel.notes,
      createdAt: rel.createdAt.toISOString(),
      updatedAt: rel.updatedAt.toISOString(),
    };
  }
}
