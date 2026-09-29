export interface AuditEventPayload {
  eventName: string;
  actorId: string;
  actorRole: string;
  resourceId: string;
  resourceType: string;
  action: string;
  metadata?: Record<string, string | number | boolean | null> | undefined;
  timestamp: Date;
}

export interface IVerificationAuditService {
  recordEvent(event: AuditEventPayload): Promise<void>;
  getEventsForResource(resourceId: string): Promise<AuditEventPayload[]>;
}

export const VERIFICATION_AUDIT_SERVICE = Symbol('VERIFICATION_AUDIT_SERVICE');
