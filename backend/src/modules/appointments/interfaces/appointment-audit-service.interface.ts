export interface AppointmentAuditEvent {
  event:
    | 'APPOINTMENT_RESERVED'
    | 'APPOINTMENT_REQUESTED'
    | 'APPOINTMENT_CONFIRMED'
    | 'APPOINTMENT_DECLINED'
    | 'APPOINTMENT_CANCELLED'
    | 'APPOINTMENT_STARTED'
    | 'APPOINTMENT_COMPLETED'
    | 'APPOINTMENT_NO_SHOW'
    | 'APPOINTMENT_EXPIRED'
    | 'RESERVATION_EXPIRED'
    | 'APPOINTMENTS_ACCESSED'
    | 'APPOINTMENT_ACCESSED'
    | 'PRE_CONSULTATION_DRAFTED'
    | 'PRE_CONSULTATION_SUBMITTED'
    | 'PRE_CONSULTATION_ACCESSED';
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface IAppointmentAuditService {
  logEvent(event: AppointmentAuditEvent): void;
}

export const APPOINTMENT_AUDIT_SERVICE = Symbol('APPOINTMENT_AUDIT_SERVICE');
