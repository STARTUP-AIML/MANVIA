import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WellnessCheckInResponseDto {
  @ApiProperty({
    description: 'Unique internal UUID of the check-in record',
    example: 'd3b07384-d113-4944-9c87-8321e0028a7b',
  })
  public id!: string;

  @ApiProperty({
    description: 'Internal UUID of the owning patient profile',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  public patientId!: string;

  @ApiProperty({
    description: 'Subjective mood score on a 1–5 non-clinical scale (1: Very Low, 5: Excellent)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  public mood!: number;

  @ApiProperty({
    description: 'Subjective stress score on a 1–5 non-clinical scale (1: Very Low, 5: Very High)',
    minimum: 1,
    maximum: 5,
    example: 2,
  })
  public stress!: number;

  @ApiProperty({
    description: 'Subjective energy score on a 1–5 non-clinical scale (1: Very Low, 5: Very High)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  public energy!: number;

  @ApiProperty({
    description:
      'Subjective sleep quality score on a 1–5 non-clinical scale (1: Very Poor, 5: Excellent)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  public sleepQuality!: number;

  @ApiPropertyOptional({
    description: 'Duration of sleep recorded in minutes',
    example: 450,
    nullable: true,
  })
  public sleepDurationMinutes?: number | null;

  @ApiPropertyOptional({
    description: 'Optional personal reflection or non-diagnostic journal note',
    example: 'Felt much more focused today after morning walk.',
    nullable: true,
  })
  public note?: string | null;

  @ApiProperty({
    description: 'Timestamp when the check-in was recorded (ISO 8601 string)',
    example: '2026-09-29T10:00:00.000Z',
  })
  public recordedAt!: string;

  @ApiProperty({
    description: 'Timestamp when the check-in record was created in MANVIA',
    example: '2026-09-29T10:00:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Timestamp when the check-in record was last updated',
    example: '2026-09-29T10:00:00.000Z',
  })
  public updatedAt!: string;
}

export class PaginatedWellnessCheckInsResponseDto {
  @ApiProperty({
    description: 'List of wellness check-in entries',
    type: [WellnessCheckInResponseDto],
  })
  public data!: WellnessCheckInResponseDto[];

  @ApiProperty({ description: 'Total count of records matching query filter', example: 42 })
  public total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  public page!: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  public limit!: number;

  @ApiProperty({ description: 'Total number of pages', example: 3 })
  public totalPages!: number;
}
