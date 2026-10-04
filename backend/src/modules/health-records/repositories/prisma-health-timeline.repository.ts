import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import type { TimelineEventEntity } from '../entities/timeline-event.entity.js';
import { TimelineEventType } from '../enums/timeline-event-type.enum.js';
import type {
  CreateTimelineEventInput,
  IHealthTimelineRepository,
  TimelineQueryOptions,
} from '../interfaces/health-timeline-repository.interface.js';
import { generatePublicTimelineEventId } from '../utils/public-record-id.util.js';

interface RawTimelineEvent {
  id: string;
  publicEventId: string;
  patientId: string;
  eventType: TimelineEventType;
  title: string;
  summary: string;
  sourceType: string;
  sourceId: string | null;
  eventTimestamp: string | Date;
  metadata: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaClientLike {
  timelineEvent: PrismaModelDelegate<RawTimelineEvent>;
}

@Injectable()
export class PrismaHealthTimelineRepository implements IHealthTimelineRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(
    @Optional()
    @Inject(PrismaService)
    prisma?: PrismaClientLike | PrismaService,
  ) {
    this.prisma = (prisma ?? undefined) as unknown as PrismaClientLike | undefined;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaHealthTimelineRepository. Provide a valid Prisma client or use InMemoryHealthTimelineRepository.',
      );
    }
    return this.prisma;
  }

  private mapToEntity(raw: RawTimelineEvent): TimelineEventEntity {
    let parsedMetadata: Record<string, unknown> | null = null;
    if (raw.metadata) {
      try {
        parsedMetadata = JSON.parse(raw.metadata);
      } catch {
        parsedMetadata = null;
      }
    }

    return {
      id: raw.id,
      publicEventId: raw.publicEventId,
      patientId: raw.patientId,
      eventType: raw.eventType,
      title: raw.title,
      summary: raw.summary,
      sourceType: raw.sourceType,
      sourceId: raw.sourceId,
      eventTimestamp: new Date(raw.eventTimestamp),
      metadata: parsedMetadata,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  public async create(input: CreateTimelineEventInput): Promise<TimelineEventEntity> {
    const client = this.getClient();
    const publicEventId = input.publicEventId ?? generatePublicTimelineEventId();
    const eventTimestamp = input.eventTimestamp ? new Date(input.eventTimestamp) : new Date();

    const created = await client.timelineEvent.create({
      data: {
        publicEventId,
        patientId: input.patientId,
        eventType: input.eventType,
        title: input.title,
        summary: input.summary,
        sourceType: input.sourceType,
        sourceId: input.sourceId ?? null,
        eventTimestamp,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });

    return this.mapToEntity(created);
  }

  public async findById(id: string): Promise<TimelineEventEntity | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    const client = this.getClient();
    const found = await client.timelineEvent.findUnique({
      where: { id },
    });
    return found ? this.mapToEntity(found) : null;
  }

  public async findByPublicId(publicEventId: string): Promise<TimelineEventEntity | null> {
    const client = this.getClient();
    const found = await client.timelineEvent.findUnique({
      where: { publicEventId },
    });
    return found ? this.mapToEntity(found) : null;
  }

  public async findPatientEvent(
    patientId: string,
    eventIdOrPublicId: string,
  ): Promise<TimelineEventEntity | null> {
    const client = this.getClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        eventIdOrPublicId,
      );

    if (!client.timelineEvent.findFirst) {
      if (isUuid) {
        const byId = await this.findById(eventIdOrPublicId);
        if (byId && byId.patientId === patientId) return byId;
      }
      const byPub = await this.findByPublicId(eventIdOrPublicId);
      if (byPub && byPub.patientId === patientId) return byPub;
      return null;
    }

    const where: Record<string, unknown> = {
      patientId,
      ...(isUuid ? { id: eventIdOrPublicId } : { publicEventId: eventIdOrPublicId }),
    };

    const found = await client.timelineEvent.findFirst({ where });

    return found ? this.mapToEntity(found) : null;
  }

  public async findMany(
    options: TimelineQueryOptions,
  ): Promise<{ data: TimelineEventEntity[]; total: number }> {
    const client = this.getClient();
    const { patientId, eventType, eventTypes, startDate, endDate, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = {
      patientId,
    };

    if (eventType) {
      where.eventType = eventType;
    } else if (eventTypes && eventTypes.length > 0) {
      where.eventType = { in: eventTypes };
    }

    if (startDate || endDate) {
      const eventTimestampFilter: Record<string, unknown> = {};
      if (startDate) {
        eventTimestampFilter.gte = new Date(startDate);
      }
      if (endDate) {
        eventTimestampFilter.lte = new Date(endDate);
      }
      where.eventTimestamp = eventTimestampFilter;
    }

    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      client.timelineEvent.findMany({
        where,
        orderBy: [{ eventTimestamp: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      client.timelineEvent.count ? client.timelineEvent.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data: rows.map((e) => this.mapToEntity(e)),
      total,
    };
  }

  public async countByPatient(patientId: string): Promise<number> {
    const client = this.getClient();
    if (!client.timelineEvent.count) {
      return 0;
    }
    return client.timelineEvent.count({
      where: { patientId },
    });
  }
}
