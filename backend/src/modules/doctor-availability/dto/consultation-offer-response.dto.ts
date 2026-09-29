import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType } from '../enums/consultation-type.enum.js';
import { OfferStatus } from '../enums/offer-status.enum.js';

export class ConsultationOfferResponseDto {
  @ApiProperty({
    description: 'Unique consultation offer identifier',
    example: 'c1b2c3d4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Title of consultation offer',
    example: '30-Minute General Consultation',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Clinical service description',
    example: 'Evaluation and prescription review.',
  })
  description!: string | null;

  @ApiProperty({
    description: 'Consultation type',
    enum: ConsultationType,
    example: ConsultationType.GENERAL,
  })
  consultationType!: ConsultationType;

  @ApiProperty({
    description: 'Consultation duration in minutes',
    example: 30,
  })
  durationMinutes!: number;

  @ApiProperty({
    description: 'Consultation fee / pricing metadata',
    example: 75.0,
  })
  fee!: number;

  @ApiProperty({
    description: '3-letter ISO currency code',
    example: 'USD',
  })
  currency!: string;

  @ApiProperty({
    description: 'Lifecycle status of offer',
    enum: OfferStatus,
    example: OfferStatus.ACTIVE,
  })
  status!: OfferStatus;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2026-09-29T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2026-09-29T10:00:00.000Z',
  })
  updatedAt!: string;
}
