export type NotificationType =
  | 'APPOINTMENT_REQUESTED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_DECLINED'
  | 'APPOINTMENT_CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'REFUND_REQUESTED'
  | 'REFUND_COMPLETED'
  | 'INVOICE_ISSUED'
  | 'PAYOUT_STATUS_CHANGED'
  | 'SYSTEM_ALERT'
  | 'CLINICAL_REMINDER';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';

export type NotificationSeverity = 'LOW' | 'INFO' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface NotificationResponseDto {
  id: string;
  publicNotificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface PaginatedNotificationsResponseDto {
  data: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export interface NotificationQueryParams {
  unreadOnly?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  page?: number;
  limit?: number;
}

export interface NotificationPreferenceResponseDto {
  id: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  appointmentReminders: boolean;
  marketingUpdates: boolean;
  securityAlerts: boolean; // strictly true/mandatory
}

export interface UpdateNotificationPreferenceDto {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  smsEnabled?: boolean;
  appointmentReminders?: boolean;
  marketingUpdates?: boolean;
}
