import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { HealthRecordCategory } from '../enums/health-record-category.enum.js';

export const ALLOWED_HEALTH_RECORD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'application/dicom',
];

export const MAX_HEALTH_RECORD_FILE_SIZE_BYTES = 26_214_400; // 25 MB

export class CreateUploadIntentDto {
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
    example: 'Fasting Lipid & HbA1c Panel',
  })
  @Transform(({ value, obj }) => value ?? obj.documentTitle)
  @IsString({ message: 'title must be a string' })
  @MaxLength(200, { message: 'title cannot exceed 200 characters' })
  public title!: string;

  @ApiPropertyOptional({
    description: 'Alternative alias for title',
    maxLength: 200,
    example: 'Fasting Lipid & HbA1c Panel',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  public documentTitle?: string;

  @ApiProperty({
    description: 'Original name of the uploaded file',
    maxLength: 255,
    example: 'blood_work_sep2026.pdf',
  })
  @IsString({ message: 'fileName must be a string' })
  @MaxLength(255, { message: 'fileName cannot exceed 255 characters' })
  public fileName!: string;

  @ApiProperty({
    description: 'Size of the document in bytes (max 25 MB)',
    minimum: 1,
    maximum: MAX_HEALTH_RECORD_FILE_SIZE_BYTES,
    example: 1450200,
  })
  @IsInt({ message: 'fileSizeBytes must be an integer' })
  @Min(1, { message: 'fileSizeBytes must be at least 1 byte' })
  @Max(MAX_HEALTH_RECORD_FILE_SIZE_BYTES, {
    message: `fileSizeBytes cannot exceed ${MAX_HEALTH_RECORD_FILE_SIZE_BYTES} bytes (25 MB)`,
  })
  public fileSizeBytes!: number;

  @ApiProperty({
    description: 'MIME type of the document',
    example: 'application/pdf',
    enum: ALLOWED_HEALTH_RECORD_MIME_TYPES,
  })
  @Transform(({ value, obj }) => value ?? obj.fileMimeType)
  @IsString({ message: 'mimeType must be a string' })
  public mimeType!: string;

  @ApiPropertyOptional({
    description: 'Alternative alias for mimeType',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  public fileMimeType?: string;

  @ApiProperty({
    description:
      'Clinical date when the medical event, test, or consultation took place (ISO 8601)',
    example: '2026-09-18',
  })
  @IsISO8601({}, { message: 'recordedDate must be a valid ISO 8601 date string' })
  public recordedDate!: string;

  @ApiPropertyOptional({
    description: 'Optional clinical notes or context for the document',
    maxLength: 2000,
    example: 'Annual fasting blood work ordered by Dr. House.',
  })
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(2000, { message: 'description cannot exceed 2000 characters' })
  public description?: string;

  @ApiPropertyOptional({
    description: 'Optional SHA-256 cryptographic digest of the document for tamper verification',
    maxLength: 64,
    example: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/, { message: 'sha256Hash must be a 64-character hexadecimal string' })
  public sha256Hash?: string;
}
