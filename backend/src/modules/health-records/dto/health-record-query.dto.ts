import { IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { HealthRecordCategory } from '../enums/health-record-category.enum.js';
import { HealthRecordStatus } from '../enums/health-record-status.enum.js';

export class HealthRecordQueryDto {
  @ApiPropertyOptional({
    description: 'Filter records by category',
    enum: HealthRecordCategory,
    example: HealthRecordCategory.LAB_REPORT,
  })
  @IsOptional()
  @IsEnum(HealthRecordCategory, {
    message: `category must be one of: ${Object.values(HealthRecordCategory).join(', ')}`,
  })
  public category?: HealthRecordCategory;

  @ApiPropertyOptional({
    description: 'Filter records by lifecycle status',
    enum: HealthRecordStatus,
    default: HealthRecordStatus.AVAILABLE,
    example: HealthRecordStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(HealthRecordStatus)
  public status?: HealthRecordStatus = HealthRecordStatus.AVAILABLE;

  @ApiPropertyOptional({
    description: 'Filter records from start date (ISO 8601 date string)',
    example: '2026-09-01',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'startDate must be a valid ISO 8601 date string' })
  public startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter records up to end date (ISO 8601 date string)',
    example: '2026-09-30',
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
    description: 'Number of records per page (max 100)',
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
