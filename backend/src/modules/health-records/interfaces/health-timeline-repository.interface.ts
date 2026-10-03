import type { TimelineEventEntity } from '../entities/timeline-event.entity.js';
import type { TimelineEventType } from '../enums/timeline-event-type.enum.js';

export interface CreateTimelineEventInput {
  publicEventId?: string | undefined;
  patientId: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId?: string | null | undefined;
  eventTimestamp: Date;
  metadata?: Record<string, unknown> | null | undefined;
}

export interface TimelineQueryOptions {
  patientId: string;
  eventType?: TimelineEventType | undefined;
  eventTypes?: TimelineEventType[] | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface IHealthTimelineRepository {
  create(input: CreateTimelineEventInput): Promise<TimelineEventEntity>;
  findById(id: string): Promise<TimelineEventEntity | null>;
  findByPublicId(publicEventId: string): Promise<TimelineEventEntity | null>;
  findPatientEvent(
    patientId: string,
    eventIdOrPublicId: string,
  ): Promise<TimelineEventEntity | null>;
  findMany(options: TimelineQueryOptions): Promise<{ data: TimelineEventEntity[]; total: number }>;
  countByPatient(patientId: string): Promise<number>;
}

export const HEALTH_TIMELINE_REPOSITORY = Symbol('HEALTH_TIMELINE_REPOSITORY');
