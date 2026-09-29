// ==============================================================================
// MANVIA — Emergency Contact DTO
// ==============================================================================
// Phase 6: Patient Emergency Contact Schema
// ==============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class EmergencyContactDto {
  @ApiPropertyOptional({
    example: 'Anil Sharma',
    description: 'Full name of emergency contact person',
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: 'Emergency contact name must be a string' })
  @MaxLength(150, { message: 'Emergency contact name cannot exceed 150 characters' })
  public name?: string | undefined;

  @ApiPropertyOptional({
    example: '+14155552671',
    description: 'Phone number of emergency contact person',
    maxLength: 32,
  })
  @IsOptional()
  @IsString({ message: 'Emergency contact phone must be a string' })
  @MaxLength(32, { message: 'Emergency contact phone cannot exceed 32 characters' })
  public phone?: string | undefined;

  @ApiPropertyOptional({
    example: 'SPOUSE',
    description: 'Relationship of emergency contact to patient',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Emergency contact relationship must be a string' })
  @MaxLength(50, { message: 'Emergency contact relationship cannot exceed 50 characters' })
  public relationship?: string | undefined;
}
