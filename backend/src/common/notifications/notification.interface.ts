export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

export type NotificationType =
  | 'APPOINTMENT_CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_PROCESSED'
  | 'REFUND_FAILED'
  | 'WAITLIST_JOINED'
  | 'WAITLIST_OFFER_CREATED'
  | 'WAITLIST_OFFER_EXPIRED'
  | 'WAITLIST_OFFER_DECLINED'
  | 'WAITLIST_FULFILLED';

export interface NotificationPayload {
  recipientId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
}

export interface INotificationService {
  send(payload: NotificationPayload): Promise<boolean>;
  getDispatchedNotifications(): NotificationPayload[];
  clear(): void;
}

export const NOTIFICATION_SERVICE = Symbol('NOTIFICATION_SERVICE');
