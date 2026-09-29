import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreConsultationDraftDto {
  @ApiProperty({
    description: 'Primary reason for the consultation request',
    maxLength: 1000,
    example: 'Recurring headaches and fatigue over the past 2 weeks.',
  })
  @IsString({ message: 'reasonForVisit must be a string' })
  @IsNotEmpty({ message: 'reasonForVisit cannot be empty' })
  @MaxLength(1000, { message: 'reasonForVisit cannot exceed 1000 characters' })
  public reasonForVisit!: string;

  @ApiPropertyOptional({
    description: 'Detailed description of symptoms',
    maxLength: 2000,
    example: 'Throbbing pain on left side of head, mild sensitivity to bright light.',
  })
  @IsOptional()
  @IsString({ message: 'symptoms must be a string' })
  @MaxLength(2000, { message: 'symptoms cannot exceed 2000 characters' })
  public symptoms?: string;

  @ApiPropertyOptional({
    description: 'Approximate onset time or duration of symptoms',
    maxLength: 100,
    example: 'Started 10 days ago after high-stress deadline',
  })
  @IsOptional()
  @IsString({ message: 'symptomOnset must be a string' })
  @MaxLength(100, { message: 'symptomOnset cannot exceed 100 characters' })
  public symptomOnset?: string;

  @ApiPropertyOptional({
    description: 'Current prescription or over-the-counter medications taken by the patient',
    maxLength: 2000,
    example: 'Ibuprofen 400mg occasionally as needed, Multivitamin daily.',
  })
  @IsOptional()
  @IsString({ message: 'currentMedications must be a string' })
  @MaxLength(2000, { message: 'currentMedications cannot exceed 2000 characters' })
  public currentMedications?: string;

  @ApiPropertyOptional({
    description: 'Known drug or environmental allergies',
    maxLength: 1000,
    example: 'Penicillin (mild hives), Pollen.',
  })
  @IsOptional()
  @IsString({ message: 'allergies must be a string' })
  @MaxLength(1000, { message: 'allergies cannot exceed 1000 characters' })
  public allergies?: string;

  @ApiPropertyOptional({
    description: 'Additional personal notes or specific questions for the physician',
    maxLength: 2000,
    example: 'Would like to discuss whether an eye examination or MRI is recommended.',
  })
  @IsOptional()
  @IsString({ message: 'patientNotes must be a string' })
  @MaxLength(2000, { message: 'patientNotes cannot exceed 2000 characters' })
  public patientNotes?: string;
}
