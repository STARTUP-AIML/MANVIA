export interface RefundAuditEvent {
  event:
    | 'REFUND_REQUESTED'
    | 'REFUND_PROCESSING'
    | 'REFUND_SUCCEEDED'
    | 'REFUND_FAILED'
    | 'REFUND_CANCELLED'
    | 'REFUND_ACCESSED'
    | 'REFUNDS_ACCESSED';
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export interface IRefundAuditService {
  logEvent(event: RefundAuditEvent): void;
}

export const REFUND_AUDIT_SERVICE = Symbol('REFUND_AUDIT_SERVICE');
