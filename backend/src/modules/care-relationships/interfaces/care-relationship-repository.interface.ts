import type {
  CareRelationshipEntity,
  ConsentEntity,
  ConsentHistoryEntity,
  PatientProfileEntity,
} from '../entities/index.js';
import type { CareRelationshipStatus } from '../enums/care-relationship-status.enum.js';
import type { ConsentScope } from '../enums/consent-scope.enum.js';
import type { ConsentStatus } from '../enums/consent-status.enum.js';
import type { ConsentAction } from '../enums/consent-action.enum.js';

export const CARE_RELATIONSHIP_REPOSITORY = Symbol('CARE_RELATIONSHIP_REPOSITORY');

export interface ICareRelationshipRepository {
  // Patient Profile
  createPatientProfile(
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
  ): Promise<PatientProfileEntity>;
  findPatientByUserId(userId: string): Promise<PatientProfileEntity | null>;
  findPatientById(id: string): Promise<PatientProfileEntity | null>;
  findPatientByPublicId(publicId: string): Promise<PatientProfileEntity | null>;

  // Care Relationship
  createCareRelationship(data: {
    patientId: string;
    doctorId: string;
    status?: CareRelationshipStatus;
    notes?: string | null;
    establishedAt?: Date | null;
  }): Promise<CareRelationshipEntity>;
  findCareRelationshipById(id: string): Promise<CareRelationshipEntity | null>;
  findCareRelationship(patientId: string, doctorId: string): Promise<CareRelationshipEntity | null>;
  findCareRelationshipsByPatientId(
    patientId: string,
    activeOnly?: boolean,
  ): Promise<CareRelationshipEntity[]>;
  findCareRelationshipsByDoctorId(
    doctorId: string,
    activeOnly?: boolean,
  ): Promise<CareRelationshipEntity[]>;
  updateCareRelationship(
    id: string,
    data: Partial<CareRelationshipEntity>,
  ): Promise<CareRelationshipEntity>;

  // Consent
  createConsent(data: {
    patientId: string;
    doctorId: string;
    careRelationshipId?: string | null;
    scope: ConsentScope;
    purpose?: string | null;
    expiresAt?: Date | null;
    status?: ConsentStatus;
  }): Promise<ConsentEntity>;
  findConsentById(id: string): Promise<ConsentEntity | null>;
  findConsentsByPatientId(patientId: string, activeOnly?: boolean): Promise<ConsentEntity[]>;
  findConsentsByDoctorId(
    doctorId: string,
    patientId?: string,
    activeOnly?: boolean,
  ): Promise<ConsentEntity[]>;
  findActiveConsent(
    patientId: string,
    doctorId: string,
    scope: ConsentScope,
  ): Promise<ConsentEntity | null>;
  updateConsent(id: string, data: Partial<ConsentEntity>): Promise<ConsentEntity>;

  // Consent Audit History
  addConsentHistory(data: {
    consentId: string;
    action: ConsentAction;
    actorId: string;
    actorRole: string;
    reason?: string | null;
    metadata?: string | null;
  }): Promise<ConsentHistoryEntity>;
  getConsentHistory(consentId: string): Promise<ConsentHistoryEntity[]>;
}
