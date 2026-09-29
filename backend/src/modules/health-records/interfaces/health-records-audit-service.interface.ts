export interface HealthRecordsAuditEvent {
  event:
    | 'HEALTH_RECORD_UPLOAD_INTENT'
    | 'HEALTH_RECORD_CREATED'
    | 'HEALTH_RECORD_FINALIZED'
    | 'HEALTH_RECORD_UPDATED'
    | 'HEALTH_RECORD_DELETED'
    | 'HEALTH_RECORD_ACCESSED'
    | 'HEALTH_RECORD_FILE_ACCESSED'
    | 'HEALTH_RECORDS_ACCESSED'
    | 'HEALTH_RECORD_DOWNLOAD_URL_REQUESTED'
    | 'TIMELINE_EVENT_RECORDED'
    | 'TIMELINE_VIEWED'
    | 'HEALTH_TIMELINE_ACCESSED'
    | 'DOCTOR_ACCESSED_PATIENT_HEALTH_RECORDS'
    | 'DOCTOR_ACCESSED_PATIENT_HEALTH_RECORD_FILE'
    | 'DOCTOR_ACCESSED_PATIENT_TIMELINE';
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface IHealthRecordsAuditService {
  logEvent(event: HealthRecordsAuditEvent): void;
}

export const HEALTH_RECORDS_AUDIT_SERVICE = Symbol('HEALTH_RECORDS_AUDIT_SERVICE');
