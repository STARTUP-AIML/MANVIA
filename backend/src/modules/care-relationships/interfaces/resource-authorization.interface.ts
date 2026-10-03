import type { ConsentScope } from '../enums/consent-scope.enum.js';

export const RESOURCE_AUTHORIZATION_SERVICE = Symbol('RESOURCE_AUTHORIZATION_SERVICE');

export interface AccessCheckRequest {
  actorUserId: string;
  actorRole: string;
  patientId: string; // PatientProfile internal UUID or publicPatientId
  resourceType: ConsentScope;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  careRelationshipId?: string;
  consentId?: string;
}

export interface IResourceAuthorizationService {
  canAccessPatientResource(request: AccessCheckRequest): Promise<AccessDecision>;
}
