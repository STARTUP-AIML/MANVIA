import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HealthRecordCategory } from '../enums/health-record-category.enum.js';
import { HealthRecordStatus } from '../enums/health-record-status.enum.js';

export class HealthRecordResponseDto {
  @ApiProperty({
    description: 'Internal unique UUID of the health record',
    example: 'd9b07384-d113-4944-9c87-8321e0028a7b',
  })
  public id!: string;

  @ApiProperty({
    description: 'Public, non-sequential record identifier (REC-XXXXXXXX)',
    example: 'REC-7492ABCD',
  })
  public publicRecordId!: string;

  @ApiProperty({
    description: 'Internal UUID of the patient profile',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  public patientId!: string;

  @ApiProperty({
    description: 'Category classification of the health record',
    enum: HealthRecordCategory,
    example: HealthRecordCategory.LAB_REPORT,
  })
  public category!: HealthRecordCategory;

  @ApiProperty({
    description: 'Title of the health record',
    example: 'Fasting Lipid & HbA1c Panel',
  })
  public title!: string;

  @ApiPropertyOptional({
    description: 'Clinical notes or description',
    example: 'Annual fasting blood work.',
    nullable: true,
  })
  public description?: string | null;

  @ApiProperty({
    description: 'Original name of the uploaded document',
    example: 'blood_work_sep2026.pdf',
  })
  public originalFileName!: string;

  @ApiProperty({
    description: 'Verified MIME type of the document',
    example: 'application/pdf',
  })
  public mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1450200,
  })
  public fileSizeBytes!: number;

  @ApiProperty({
    description: 'Current lifecycle status of the health record',
    enum: HealthRecordStatus,
    example: HealthRecordStatus.AVAILABLE,
  })
  public status!: HealthRecordStatus;

  @ApiProperty({
    description: 'Clinical date of the medical test or event (ISO 8601 string)',
    example: '2026-09-18T00:00:00.000Z',
  })
  public recordedDate!: string;

  @ApiProperty({
    description: 'Timestamp when the record was ingested into MANVIA',
    example: '2026-09-18T09:15:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Timestamp when the record metadata was last updated',
    example: '2026-09-18T09:15:00.000Z',
  })
  public updatedAt!: string;
}

export class PaginatedHealthRecordsResponseDto {
  @ApiProperty({
    description: 'List of health record metadata entries',
    type: [HealthRecordResponseDto],
  })
  public data!: HealthRecordResponseDto[];

  @ApiProperty({ description: 'Total count of records matching criteria', example: 12 })
  public total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  public page!: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  public limit!: number;

  @ApiProperty({ description: 'Total available pages', example: 1 })
  public totalPages!: number;
}
