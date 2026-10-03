export interface WellnessAuditEvent {
  event:
    | 'WELLNESS_CHECK_IN_CREATED'
    | 'WELLNESS_CHECK_IN_UPDATED'
    | 'WELLNESS_CHECK_IN_DELETED'
    | 'DOCTOR_ACCESSED_PATIENT_WELLNESS'
    | 'WELLNESS_TRENDS_VIEWED';
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface IWellnessAuditService {
  logEvent(event: WellnessAuditEvent): void;
}

export const WELLNESS_AUDIT_SERVICE = Symbol('WELLNESS_AUDIT_SERVICE');
