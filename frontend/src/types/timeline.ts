/**
 * Authoritative Health Timeline Types — Matched directly to MANVIA Backend DTOs
 * Backend path: backend/src/modules/health-records/dto/
 */

export type TimelineEventType =
  | 'HEALTH_RECORD_ADDED'
  | 'WELLNESS_CHECK_IN'
  | 'CONSULTATION'
  | 'APPOINTMENT'
  | 'OTHER';

export interface TimelineEventResponse {
  id: string;
  publicEventId: string;
  patientId: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId?: string | null;
  eventTimestamp: string; // ISO 8601
  metadata?: Record<string, unknown> | null;
  createdAt: string; // ISO 8601
}

export interface PaginatedTimelineResponse {
  data: TimelineEventResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimelineQueryParams {
  eventType?: TimelineEventType;
  eventTypes?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
