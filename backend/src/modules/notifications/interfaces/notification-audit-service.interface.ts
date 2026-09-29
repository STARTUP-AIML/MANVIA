export interface NotificationAuditEvent {
  event: string;
  actorId: string;
  role: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
}

export interface INotificationAuditService {
  logEvent(event: NotificationAuditEvent): void;
  getAuditLogs(): NotificationAuditEvent[];
  clear(): void;
}

export const NOTIFICATION_AUDIT_SERVICE = Symbol('NOTIFICATION_AUDIT_SERVICE');
