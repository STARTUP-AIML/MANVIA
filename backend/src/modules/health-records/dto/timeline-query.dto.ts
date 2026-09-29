import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TimelineEventType } from '../enums/timeline-event-type.enum.js';

export class TimelineQueryDto {
  @ApiPropertyOptional({
    description: 'Filter timeline by a specific event type',
    enum: TimelineEventType,
    example: TimelineEventType.HEALTH_RECORD_ADDED,
  })
  @IsOptional()
  @IsEnum(TimelineEventType, {
    message: `eventType must be one of: ${Object.values(TimelineEventType).join(', ')}`,
  })
  public eventType?: TimelineEventType;

  @ApiPropertyOptional({
    description:
      'Filter timeline by comma-separated event types (e.g. "HEALTH_RECORD_ADDED,WELLNESS_CHECK_IN")',
    example: 'HEALTH_RECORD_ADDED,WELLNESS_CHECK_IN',
  })
  @IsOptional()
  @IsString()
  public eventTypes?: string;

  @ApiPropertyOptional({
    description: 'Filter events occurring on or after start date (ISO 8601 string)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'startDate must be a valid ISO 8601 date string' })
  public startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter events occurring on or before end date (ISO 8601 string)',
    example: '2026-09-30T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'endDate must be a valid ISO 8601 date string' })
  public endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (1-based)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  public page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of timeline events per page (max 100)',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  public limit?: number = 20;
}
