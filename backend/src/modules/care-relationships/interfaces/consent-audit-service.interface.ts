export const CONSENT_AUDIT_SERVICE = Symbol('CONSENT_AUDIT_SERVICE');

export interface ConsentAuditEvent {
  event:
    | 'CARE_RELATIONSHIP_CREATED'
    | 'CARE_RELATIONSHIP_TERMINATED'
    | 'CONSENT_GRANTED'
    | 'CONSENT_REVOKED'
    | 'RESOURCE_ACCESS_ALLOWED'
    | 'RESOURCE_ACCESS_DENIED';
  actorId: string;
  actorRole?: string;
  role?: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface IConsentAuditService {
  logEvent(event: ConsentAuditEvent): void;
}
