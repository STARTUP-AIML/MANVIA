// ==============================================================================
// MANVIA — Update Patient Profile Request DTO
// ==============================================================================
// Phase 6: Patient Profile Updates (Mass-Assignment Protected)
// ==============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BiologicalSex } from '@prisma/client';
import { EmergencyContactDto } from './emergency-contact.dto.js';

export class UpdatePatientProfileDto {
  @ApiPropertyOptional({
    example: 'Priya',
    description: 'Patient legal first name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Legal first name must be a string' })
  @MaxLength(100, { message: 'Legal first name cannot exceed 100 characters' })
  public legalFirstName?: string | undefined;

  @ApiPropertyOptional({
    example: 'Sharma',
    description: 'Patient legal last name',
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Legal last name must be a string' })
  @MaxLength(100, { message: 'Legal last name cannot exceed 100 characters' })
  public legalLastName?: string | undefined;

  @ApiPropertyOptional({
    example: '1984-06-15',
    description: 'Patient date of birth in ISO 8601 YYYY-MM-DD format',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Date of birth must be a valid ISO 8601 date string' })
  public dateOfBirth?: string | undefined;

  @ApiPropertyOptional({
    enum: BiologicalSex,
    example: 'FEMALE',
    description: 'Patient biological sex for clinical baselines',
  })
  @IsOptional()
  @IsEnum(BiologicalSex, { message: 'Invalid biological sex specified' })
  public biologicalSex?: BiologicalSex | undefined;

  @ApiPropertyOptional({
    example: 'B+',
    description: 'Patient ABO/Rh blood group',
    maxLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'Blood group must be a string' })
  @MaxLength(10, { message: 'Blood group cannot exceed 10 characters' })
  public bloodGroup?: string | undefined;

  @ApiPropertyOptional({
    type: () => EmergencyContactDto,
    description: 'Emergency contact information',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  public emergencyContact?: EmergencyContactDto | undefined;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Preferred language code (e.g. en, es, hi)',
    maxLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'Preferred language must be a string' })
  @MaxLength(10, { message: 'Preferred language cannot exceed 10 characters' })
  public preferredLanguage?: string | undefined;

  @ApiPropertyOptional({
    example: 'Asia/Kolkata',
    description: 'Patient local IANA timezone',
    maxLength: 64,
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  @MaxLength(64, { message: 'Timezone cannot exceed 64 characters' })
  public timezone?: string | undefined;
}
