export const PAYMENT_AUDIT_SERVICE = Symbol('PAYMENT_AUDIT_SERVICE');

export interface PaymentAuditEvent {
  event: string;
  actorId?: string;
  role?: string;
  resource: string;
  resourceId?: string;
  action: string;
  status: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface IPaymentAuditService {
  logEvent(event: PaymentAuditEvent): void;
  getAuditLogs(): PaymentAuditEvent[];
  clear(): void;
}
