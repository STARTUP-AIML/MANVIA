import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType } from '../enums/consultation-type.enum.js';
import { OfferStatus } from '../enums/offer-status.enum.js';

export class CreateConsultationOfferDto {
  @ApiProperty({
    description: 'Title of consultation service',
    minLength: 2,
    maxLength: 150,
    example: '30-Minute General Consultation',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  title!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of what is included in the consultation',
    maxLength: 1000,
    example:
      'Comprehensive virtual evaluation of symptoms, treatment advice, and prescription review.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | undefined;

  @ApiProperty({
    description: 'Category / type of medical consultation',
    enum: ConsultationType,
    example: ConsultationType.GENERAL,
  })
  @IsEnum(ConsultationType)
  consultationType!: ConsultationType;

  @ApiProperty({
    description: 'Duration of the consultation in minutes (e.g. 15, 30, 45, 60)',
    minimum: 5,
    maximum: 480,
    example: 30,
  })
  @IsInt()
  @Min(5)
  @Max(480)
  durationMinutes!: number;

  @ApiProperty({
    description: 'Consultation fee / pricing metadata',
    minimum: 0,
    example: 75.0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fee!: number;

  @ApiPropertyOptional({
    description: '3-letter ISO 4217 currency code (e.g. USD, EUR, INR, GBP)',
    default: 'USD',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string | undefined = 'USD';

  @ApiPropertyOptional({
    description: 'Initial lifecycle status of the consultation offer',
    enum: OfferStatus,
    default: OfferStatus.ACTIVE,
    example: OfferStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus | undefined = OfferStatus.ACTIVE;
}
