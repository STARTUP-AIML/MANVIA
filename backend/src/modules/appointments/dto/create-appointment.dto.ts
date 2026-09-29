import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreConsultationDraftDto } from './pre-consultation-draft.dto.js';

export class CreateAppointmentDto {
  @ApiProperty({
    description: 'Target doctor UUID or public identifier (DOC-XXXXXXXX)',
    example: 'DOC-7492ABCD',
  })
  @IsString({ message: 'doctorId must be a string' })
  @IsNotEmpty({ message: 'doctorId cannot be empty' })
  public doctorId!: string;

  @ApiProperty({
    description: 'ID of the selected active ConsultationOffer',
    example: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  })
  @IsString({ message: 'consultationOfferId must be a string' })
  @IsNotEmpty({ message: 'consultationOfferId cannot be empty' })
  public consultationOfferId!: string;

  @ApiProperty({
    description: 'Start timestamp for the requested appointment slot (ISO 8601 string)',
    example: '2026-10-05T14:00:00.000Z',
  })
  @IsISO8601({}, { message: 'startAt must be a valid ISO 8601 timestamp string' })
  public startAt!: string;

  @ApiPropertyOptional({
    description: 'Optional appointment notes from the patient',
    maxLength: 500,
    example: 'First time consultation regarding persistent cough.',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  @MaxLength(500, { message: 'notes cannot exceed 500 characters' })
  public notes?: string;

  @ApiPropertyOptional({
    description: 'Optional initial pre-consultation intake data',
    type: () => PreConsultationDraftDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreConsultationDraftDto)
  public preConsultation?: PreConsultationDraftDto;
}
