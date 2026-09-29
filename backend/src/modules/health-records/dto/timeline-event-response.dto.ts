import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimelineEventType } from '../enums/timeline-event-type.enum.js';

export class TimelineEventResponseDto {
  @ApiProperty({
    description: 'Internal unique event UUID',
    example: 'e1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  public id!: string;

  @ApiProperty({
    description: 'Public non-sequential event identifier (EVT-XXXXXXXX)',
    example: 'EVT-9812A45C',
  })
  public publicEventId!: string;

  @ApiProperty({
    description: 'Internal UUID of the patient profile',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  public patientId!: string;

  @ApiProperty({
    description: 'Category of the timeline event',
    enum: TimelineEventType,
    example: TimelineEventType.HEALTH_RECORD_ADDED,
  })
  public eventType!: TimelineEventType;

  @ApiProperty({
    description: 'Concise title of the timeline event',
    example: 'Fasting Lipid & HbA1c Panel Added',
  })
  public title!: string;

  @ApiProperty({
    description: 'Concise summary of the event (no full PHI duplication)',
    example: 'Uploaded Lab Report (PDF, 1.4 MB)',
  })
  public summary!: string;

  @ApiProperty({
    description: 'Domain resource category of origin',
    example: 'HEALTH_RECORD',
  })
  public sourceType!: string;

  @ApiPropertyOptional({
    description:
      'Reference identifier of the source domain entity (e.g. record UUID or check-in UUID)',
    example: 'd9b07384-d113-4944-9c87-8321e0028a7b',
    nullable: true,
  })
  public sourceId?: string | null;

  @ApiProperty({
    description: 'Chronological timestamp of when the health event occurred (ISO 8601 string)',
    example: '2026-09-18T09:15:00.000Z',
  })
  public eventTimestamp!: string;

  @ApiPropertyOptional({
    description: 'Optional non-sensitive metadata attributes',
    nullable: true,
  })
  public metadata?: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Timestamp when event was recorded in timeline',
    example: '2026-09-18T09:15:00.000Z',
  })
  public createdAt!: string;
}

export class PaginatedTimelineEventsResponseDto {
  @ApiProperty({
    description: 'Chronological list of timeline events',
    type: [TimelineEventResponseDto],
  })
  public data!: TimelineEventResponseDto[];

  @ApiProperty({ description: 'Total count of timeline events matching filter', example: 25 })
  public total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  public page!: number;

  @ApiProperty({ description: 'Number of events per page', example: 20 })
  public limit!: number;

  @ApiProperty({ description: 'Total available pages', example: 2 })
  public totalPages!: number;
}

export type PaginatedTimelineResponseDto = PaginatedTimelineEventsResponseDto;
export const PaginatedTimelineResponseDto = PaginatedTimelineEventsResponseDto;
