/**
 * MANVIA Dashboard & Care Journey Types & DTOs
 * Mirrored directly from MANVIA Backend contracts:
 * - Appointments API
 * - Wellness API
 * - Notifications API
 * - Health Timeline API
 */

export type AppointmentStatus =
  | "RESERVED"
  | "REQUESTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DECLINED"
  | "EXPIRED"
  | "NO_SHOW";

export interface AppointmentResponseDto {
  id: string;
  publicAppointmentId: string;
  patientId: string;
  publicPatientId?: string;
  doctorId: string;
  publicDoctorId?: string;
  doctorDisplayName?: string;
  consultationOfferId: string;
  offerTitle?: string;
  durationMinutes?: number;
  fee?: number;
  currency?: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  reservationState?: string;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
}

export interface PaginatedAppointmentsResponseDto {
  data: AppointmentResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WellnessCheckInResponseDto {
  id: string;
  publicCheckInId: string;
  patientId: string;
  checkInDate: string;
  moodScore: number;
  stressScore: number;
  energyScore: number;
  sleepQualityScore: number;
  sleepHours?: number | null;
  journalReflection?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WellnessSummaryResponseDto {
  latestCheckIn: WellnessCheckInResponseDto | null;
  todayCheckIn: WellnessCheckInResponseDto | null;
  streakDays: number;
  totalCheckIns: number;
}

export type NotificationSeverity = "LOW" | "INFO" | "WARNING" | "CRITICAL";

export interface NotificationResponseDto {
  id: string;
  publicNotificationId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  severity: NotificationSeverity;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedNotificationsResponseDto {
  data: NotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export type TimelineEventType =
  | "HEALTH_RECORD_ADDED"
  | "WELLNESS_CHECK_IN"
  | "APPOINTMENT_REQUESTED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_COMPLETED"
  | "CARE_RELATIONSHIP_CREATED"
  | "CONSENT_GRANTED"
  | "CONSENT_REVOKED";

export interface TimelineEventResponseDto {
  id: string;
  publicEventId: string;
  patientId: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId?: string | null;
  eventTimestamp: string;
}

export interface PaginatedTimelineResponseDto {
  data: TimelineEventResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
