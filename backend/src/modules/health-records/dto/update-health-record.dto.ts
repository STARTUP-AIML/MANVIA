import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { HealthRecordCategory } from '../enums/health-record-category.enum.js';

export class UpdateHealthRecordDto {
  @ApiPropertyOptional({
    description: 'Updated document title',
    maxLength: 200,
    example: 'Updated Lipid Panel 2026',
  })
  @IsOptional()
  @IsString({ message: 'title must be a string' })
  @MaxLength(200, { message: 'title cannot exceed 200 characters' })
  public title?: string;

  @ApiPropertyOptional({
    description: 'Updated category classification',
    enum: HealthRecordCategory,
    example: HealthRecordCategory.LAB_REPORT,
  })
  @IsOptional()
  @IsEnum(HealthRecordCategory, {
    message: `category must be one of: ${Object.values(HealthRecordCategory).join(', ')}`,
  })
  public category?: HealthRecordCategory;

  @ApiPropertyOptional({
    description: 'Updated clinical notes or description',
    maxLength: 2000,
    example: 'Reviewed during follow-up appointment.',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(2000, { message: 'description cannot exceed 2000 characters' })
  public description?: string;

  @ApiPropertyOptional({
    description: 'Updated clinical event date (ISO 8601)',
    example: '2026-09-18',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'recordedDate must be a valid ISO 8601 date string' })
  public recordedDate?: string;
}
