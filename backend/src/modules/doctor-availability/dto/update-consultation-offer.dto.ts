import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType } from '../enums/consultation-type.enum.js';
import { OfferStatus } from '../enums/offer-status.enum.js';

export class UpdateConsultationOfferDto {
  @ApiPropertyOptional({
    description: 'Title of consultation service',
    minLength: 2,
    maxLength: 150,
    example: '45-Minute Comprehensive Consultation',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string | undefined;

  @ApiPropertyOptional({
    description: 'Detailed description of what is included in the consultation',
    maxLength: 1000,
    example: 'Includes full clinical history and customized care recommendations.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Category / type of medical consultation',
    enum: ConsultationType,
    example: ConsultationType.SPECIALIST,
  })
  @IsOptional()
  @IsEnum(ConsultationType)
  consultationType?: ConsultationType | undefined;

  @ApiPropertyOptional({
    description: 'Duration of the consultation in minutes',
    minimum: 5,
    maximum: 480,
    example: 45,
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes?: number | undefined;

  @ApiPropertyOptional({
    description: 'Consultation fee / pricing metadata',
    minimum: 0,
    example: 120.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee?: number | undefined;

  @ApiPropertyOptional({
    description: '3-letter ISO 4217 currency code',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string | undefined;

  @ApiPropertyOptional({
    description: 'Lifecycle status of the offer (e.g. ACTIVE or INACTIVE)',
    enum: OfferStatus,
    example: OfferStatus.INACTIVE,
  })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus | undefined;
}
