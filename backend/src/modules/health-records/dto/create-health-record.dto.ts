import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HealthRecordCategory } from '../enums/health-record-category.enum.js';

export class CreateHealthRecordDto {
  @ApiProperty({
    description: 'Category classification of the health record',
    enum: HealthRecordCategory,
    example: HealthRecordCategory.LAB_REPORT,
  })
  @IsEnum(HealthRecordCategory, {
    message: `category must be one of: ${Object.values(HealthRecordCategory).join(', ')}`,
  })
  public category!: HealthRecordCategory;

  @ApiProperty({
    description: 'Descriptive title of the document or report',
    maxLength: 200,
    example: 'Comprehensive Metabolic Panel',
  })
  @IsString({ message: 'title must be a string' })
  @MaxLength(200, { message: 'title cannot exceed 200 characters' })
  public title!: string;

  @ApiProperty({
    description: 'Original name of the uploaded file',
    maxLength: 255,
    example: 'cmp_report_sep2026.pdf',
  })
  @IsString({ message: 'fileName must be a string' })
  @MaxLength(255, { message: 'fileName cannot exceed 255 characters' })
  public fileName!: string;

  @ApiProperty({
    description: 'MIME type of the document',
    example: 'application/pdf',
  })
  @IsString({ message: 'fileMimeType must be a string' })
  public fileMimeType!: string;

  @ApiPropertyOptional({
    description: 'Optional Base64-encoded document content buffer for direct ingest',
    example: 'JVBERi0xLjQK...',
  })
  @IsOptional()
  @IsString()
  public fileContentBase64?: string;

  @ApiPropertyOptional({
    description: 'Size of document in bytes (inferred from buffer if omitted)',
    minimum: 1,
    example: 204800,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  public fileSizeBytes?: number;

  @ApiProperty({
    description: 'Clinical date when the medical event took place (ISO 8601)',
    example: '2026-09-18',
  })
  @IsISO8601({}, { message: 'recordedDate must be a valid ISO 8601 date string' })
  public recordedDate!: string;

  @ApiPropertyOptional({
    description: 'Optional clinical notes or context for the document',
    maxLength: 2000,
    example: 'Ordered by Dr. House after annual checkup.',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(2000, { message: 'description cannot exceed 2000 characters' })
  public description?: string;
}
