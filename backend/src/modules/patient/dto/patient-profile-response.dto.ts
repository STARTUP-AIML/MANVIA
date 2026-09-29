// ==============================================================================
// MANVIA — Patient Profile Response DTO
// ==============================================================================
// Phase 6: Sanitized Patient Profile Output Contract
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BiologicalSex } from '@prisma/client';
import { EmergencyContactDto } from './emergency-contact.dto.js';
import type { PatientProfile } from '../patient.interface.js';

export class PatientProfileResponseDto {
  @ApiProperty({
    example: 'a3b89012-c456-4789-8901-234567890123',
    description: 'Internal profile primary key',
  })
  public id!: string;

  @ApiProperty({
    example: 'PAT-48291048',
    description: 'Public, non-sequential patient identifier safe for external APIs',
  })
  public publicPatientId!: string;

  @ApiPropertyOptional({
    example: 'Priya',
    nullable: true,
    description: 'Patient legal first name',
  })
  public legalFirstName!: string | null;

  @ApiPropertyOptional({
    example: 'Sharma',
    nullable: true,
    description: 'Patient legal last name',
  })
  public legalLastName!: string | null;

  @ApiPropertyOptional({
    example: '1984-06-15',
    nullable: true,
    description: 'Date of birth in YYYY-MM-DD format',
  })
  public dateOfBirth!: string | null;

  @ApiPropertyOptional({
    enum: BiologicalSex,
    example: 'FEMALE',
    nullable: true,
    description: 'Patient biological sex for clinical baselines',
  })
  public biologicalSex!: BiologicalSex | null;

  @ApiPropertyOptional({
    example: 'B+',
    nullable: true,
    description: 'Patient blood group',
  })
  public bloodGroup!: string | null;

  @ApiPropertyOptional({
    type: () => EmergencyContactDto,
    nullable: true,
    description: 'Emergency contact details',
  })
  public emergencyContact!: EmergencyContactDto | null;

  @ApiProperty({
    example: 'en',
    description: 'Preferred interface and communication language',
  })
  public preferredLanguage!: string;

  @ApiProperty({
    example: 'Asia/Kolkata',
    description: 'Patient local IANA timezone',
  })
  public timezone!: string;

  @ApiProperty({
    example: '2026-01-10T08:30:00.000Z',
    description: 'Profile creation timestamp',
  })
  public createdAt!: string;

  @ApiProperty({
    example: '2026-01-10T08:30:00.000Z',
    description: 'Profile last update timestamp',
  })
  public updatedAt!: string;

  public static from(profile: PatientProfile): PatientProfileResponseDto {
    const dto = new PatientProfileResponseDto();
    dto.id = profile.id;
    dto.publicPatientId = profile.publicPatientId;
    dto.legalFirstName = profile.legalFirstName;
    dto.legalLastName = profile.legalLastName;
    dto.dateOfBirth = profile.dateOfBirth
      ? (profile.dateOfBirth.toISOString().split('T')[0] ?? null)
      : null;
    dto.biologicalSex = profile.biologicalSex;
    dto.bloodGroup = profile.bloodGroup;

    if (
      profile.emergencyContactName ||
      profile.emergencyContactPhone ||
      profile.emergencyContactRelationship
    ) {
      dto.emergencyContact = {
        name: profile.emergencyContactName ?? undefined,
        phone: profile.emergencyContactPhone ?? undefined,
        relationship: profile.emergencyContactRelationship ?? undefined,
      };
    } else {
      dto.emergencyContact = null;
    }

    dto.preferredLanguage = profile.preferredLanguage;
    dto.timezone = profile.timezone;
    dto.createdAt = profile.createdAt.toISOString();
    dto.updatedAt = profile.updatedAt.toISOString();

    return dto;
  }
}
