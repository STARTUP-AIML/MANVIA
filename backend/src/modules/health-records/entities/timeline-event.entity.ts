import type { TimelineEventType } from '../enums/timeline-event-type.enum.js';

export interface TimelineEventEntity {
  id: string;
  publicEventId: string;
  patientId: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId: string | null;
  eventTimestamp: Date;
  metadata?: Record<string, unknown> | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}
