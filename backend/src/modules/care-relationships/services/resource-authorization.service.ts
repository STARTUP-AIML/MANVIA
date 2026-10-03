import { Inject, Injectable } from '@nestjs/common';
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
import type {
  AccessCheckRequest,
  AccessDecision,
  IResourceAuthorizationService,
} from '../interfaces/resource-authorization.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../enums/consent-status.enum.js';

@Injectable()
export class ResourceAuthorizationService implements IResourceAuthorizationService {
  constructor(
    @Inject(CARE_RELATIONSHIP_REPOSITORY)
    private readonly careRelRepo: ICareRelationshipRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Inject(CONSENT_AUDIT_SERVICE)
    private readonly auditService: IConsentAuditService,
  ) {}

  public async canAccessPatientResource(request: AccessCheckRequest): Promise<AccessDecision> {
    const { actorUserId, actorRole, patientId, resourceType } = request;

    if (!actorUserId) {
      return this.deny(
        request,
        'Access denied: unauthenticated caller cannot access patient resources',
      );
    }

    // 1. Resolve target patient
    const patient = patientId.startsWith('PAT-')
      ? await this.careRelRepo.findPatientByPublicId(patientId)
      : await this.careRelRepo.findPatientById(patientId);

    if (!patient) {
      return this.deny(request, 'Access denied: target patient resource does not exist');
    }

    // 2. Patient self-access: patients always possess intrinsic access to their own records
    if (actorRole === 'PATIENT' && patient.userId === actorUserId) {
      this.auditService.logEvent({
        event: 'RESOURCE_ACCESS_ALLOWED',
        actorId: actorUserId,
        role: actorRole,
        resource: `PATIENT_RESOURCE:${patient.id}:${resourceType}`,
        action: 'PATIENT_SELF_ACCESS',
      });
      return { allowed: true, reason: 'Patient intrinsic self-access' };
    }

    // 3. Provider access evaluation
    if (actorRole === 'DOCTOR') {
      const doctor = await this.doctorsRepo.findByUserId(actorUserId);
      if (!doctor) {
        return this.deny(request, 'Access denied: doctor profile not found for authenticated user');
      }

      // Authoritative verification rule: unverified doctors cannot access patient data
      if (doctor.verificationStatus !== VerificationStatus.VERIFIED) {
        return this.deny(
          request,
          'Access denied: doctor is not currently an active verified healthcare provider',
        );
      }

      // Check CareRelationship existence and active state
      const relationship = await this.careRelRepo.findCareRelationship(patient.id, doctor.id);

      if (!relationship || relationship.status !== CareRelationshipStatus.ACTIVE) {
        return this.deny(
          request,
          'Access denied: no active care relationship exists between provider and patient',
        );
      }

      // Check Consent grant for specific resource scope
      const consent = await this.careRelRepo.findActiveConsent(patient.id, doctor.id, resourceType);

      if (!consent || consent.status !== ConsentStatus.ACTIVE) {
        return this.deny(
          request,
          `Access denied: patient has not granted active consent for scope '${resourceType}'`,
        );
      }

      // Check temporal expiration
      if (consent.expiresAt && new Date() >= consent.expiresAt) {
        return this.deny(
          request,
          `Access denied: patient consent for scope '${resourceType}' has expired`,
        );
      }

      // Check revocation
      if (consent.revokedAt) {
        return this.deny(
          request,
          `Access denied: patient consent for scope '${resourceType}' was revoked`,
        );
      }

      this.auditService.logEvent({
        event: 'RESOURCE_ACCESS_ALLOWED',
        actorId: actorUserId,
        role: actorRole,
        resource: `PATIENT_RESOURCE:${patient.id}:${resourceType}`,
        action: 'PROVIDER_ACCESS_PERMITTED',
        metadata: {
          careRelationshipId: relationship.id,
          consentId: consent.id,
          scope: resourceType,
        },
      });

      return {
        allowed: true,
        reason: 'Authorized via active care relationship and valid patient consent',
        careRelationshipId: relationship.id,
        consentId: consent.id,
      };
    }

    return this.deny(
      request,
      `Access denied: role '${actorRole}' is not authorized to access patient clinical resources`,
    );
  }

  private deny(request: AccessCheckRequest, reason: string): AccessDecision {
    this.auditService.logEvent({
      event: 'RESOURCE_ACCESS_DENIED',
      actorId: request.actorUserId,
      role: request.actorRole,
      resource: `PATIENT_RESOURCE:${request.patientId}:${request.resourceType}`,
      action: 'ACCESS_REJECTED',
      metadata: { reason },
    });

    return { allowed: false, reason };
  }
}
