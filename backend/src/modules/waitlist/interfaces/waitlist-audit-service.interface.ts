export interface WaitlistAuditEvent {
  event:
    | 'WAITLIST_JOINED'
    | 'WAITLIST_OFFERED'
    | 'WAITLIST_ACCEPTED'
    | 'WAITLIST_DECLINED'
    | 'WAITLIST_FULFILLED'
    | 'WAITLIST_EXPIRED'
    | 'WAITLIST_CANCELLED'
    | 'WAITLIST_ACCESSED'
    | 'WAITLIST_ENTRIES_ACCESSED';
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface IWaitlistAuditService {
  logEvent(event: WaitlistAuditEvent): void;
}

export const WAITLIST_AUDIT_SERVICE = Symbol('WAITLIST_AUDIT_SERVICE');
