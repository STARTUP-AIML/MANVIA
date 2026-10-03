import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TimelineEventEntity } from '../entities/timeline-event.entity.js';
import type {
  CreateTimelineEventInput,
  IHealthTimelineRepository,
  TimelineQueryOptions,
} from '../interfaces/health-timeline-repository.interface.js';
import { generatePublicTimelineEventId } from '../utils/public-record-id.util.js';

@Injectable()
export class InMemoryHealthTimelineRepository implements IHealthTimelineRepository {
  private events: Map<string, TimelineEventEntity> = new Map();

  public async create(input: CreateTimelineEventInput): Promise<TimelineEventEntity> {
    const id = randomUUID();
    const publicEventId = input.publicEventId ?? generatePublicTimelineEventId();
    const now = new Date();

    const event: TimelineEventEntity = {
      id,
      publicEventId,
      patientId: input.patientId,
      eventType: input.eventType,
      title: input.title,
      summary: input.summary,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      eventTimestamp: input.eventTimestamp ? new Date(input.eventTimestamp) : now,
      metadata: input.metadata ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.events.set(id, event);
    return { ...event };
  }

  public async findById(id: string): Promise<TimelineEventEntity | null> {
    const found = this.events.get(id);
    return found ? { ...found } : null;
  }

  public async findByPublicId(publicEventId: string): Promise<TimelineEventEntity | null> {
    for (const event of this.events.values()) {
      if (event.publicEventId === publicEventId) {
        return { ...event };
      }
    }
    return null;
  }

  public async findPatientEvent(
    patientId: string,
    eventIdOrPublicId: string,
  ): Promise<TimelineEventEntity | null> {
    for (const event of this.events.values()) {
      if (
        event.patientId === patientId &&
        (event.id === eventIdOrPublicId || event.publicEventId === eventIdOrPublicId)
      ) {
        return { ...event };
      }
    }
    return null;
  }

  public async findMany(
    options: TimelineQueryOptions,
  ): Promise<{ data: TimelineEventEntity[]; total: number }> {
    const { patientId, eventType, eventTypes, startDate, endDate, page = 1, limit = 20 } = options;

    let items = Array.from(this.events.values()).filter((e) => e.patientId === patientId);

    if (eventType) {
      items = items.filter((e) => e.eventType === eventType);
    } else if (eventTypes && eventTypes.length > 0) {
      items = items.filter((e) => eventTypes.includes(e.eventType));
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      items = items.filter((e) => new Date(e.eventTimestamp).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      items = items.filter((e) => new Date(e.eventTimestamp).getTime() <= end);
    }

    items.sort((a, b) => {
      const timeDiff = new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime();
      if (timeDiff !== 0) return timeDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit).map((e) => ({ ...e }));

    return { data: paginatedItems, total };
  }

  public async countByPatient(patientId: string): Promise<number> {
    return Array.from(this.events.values()).filter((e) => e.patientId === patientId).length;
  }
}
