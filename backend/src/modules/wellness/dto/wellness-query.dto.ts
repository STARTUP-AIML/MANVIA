import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class WellnessQueryDto {
  @ApiPropertyOptional({
    description: 'Filter check-ins from start date (ISO 8601 date string)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'startDate must be a valid ISO 8601 date string' })
  public startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter check-ins up to end date (ISO 8601 date string)',
    example: '2026-09-29T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'endDate must be a valid ISO 8601 date string' })
  public endDate?: string;

  @ApiPropertyOptional({
    description: 'Preset query period',
    enum: ['today', '7d', '30d', '90d', 'custom'],
    default: '30d',
    example: '7d',
  })
  @IsOptional()
  @IsIn(['today', '7d', '30d', '90d', 'custom'], {
    message: "period must be one of: 'today', '7d', '30d', '90d', 'custom'",
  })
  public period?: 'today' | '7d' | '30d' | '90d' | 'custom';

  @ApiPropertyOptional({
    description: 'Page number for paginated retrieval (1-based)',
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
    description: 'Number of items per page',
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

  @ApiPropertyOptional({
    description: "User IANA timezone identifier (e.g. 'UTC', 'Asia/Kolkata', 'America/New_York')",
    default: 'UTC',
    example: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString({ message: 'timezone must be a valid string' })
  public timezone?: string = 'UTC';
}

export class WellnessTrendsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter trends from start date (ISO 8601 date string)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'startDate must be a valid ISO 8601 date string' })
  public startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter trends up to end date (ISO 8601 date string)',
    example: '2026-09-29T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'endDate must be a valid ISO 8601 date string' })
  public endDate?: string;

  @ApiPropertyOptional({
    description: 'Predefined longitudinal analysis period',
    enum: ['7d', '30d', '90d', 'custom'],
    default: '7d',
    example: '7d',
  })
  @IsOptional()
  @IsIn(['7d', '30d', '90d', 'custom'], {
    message: "period must be one of: '7d', '30d', '90d', 'custom'",
  })
  public period?: '7d' | '30d' | '90d' | 'custom' = '7d';

  @ApiPropertyOptional({
    description: "User IANA timezone identifier (e.g. 'UTC', 'Asia/Kolkata', 'America/New_York')",
    default: 'UTC',
    example: 'Asia/Kolkata',
  })
  @IsOptional()
  @IsString({ message: 'timezone must be a valid string' })
  public timezone?: string = 'UTC';
}
