import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';

export class PreConsultationResponseDto {
  @ApiProperty({
    description: 'Internal UUID of the pre-consultation intake',
    example: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
  })
  public id!: string;

  @ApiProperty({
    description: 'Internal UUID of the associated appointment',
    example: 'd9b07384-d113-4944-9c87-8321e0028a7b',
  })
  public appointmentId!: string;

  @ApiPropertyOptional({
    description: 'Public identifier of the associated appointment (APT-XXXXXXXX)',
    example: 'APT-7492ABCD',
  })
  public publicAppointmentId?: string | undefined;

  @ApiProperty({
    description: 'Internal UUID of the patient profile',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  public patientId!: string;

  @ApiProperty({
    description: 'Current intake completion status',
    enum: PreConsultationStatus,
    example: PreConsultationStatus.SUBMITTED,
  })
  public status!: PreConsultationStatus;

  @ApiProperty({
    description: 'Primary reason for consultation visit',
    example: 'Recurring headaches and fatigue over the past 2 weeks.',
  })
  public reasonForVisit!: string;

  @ApiPropertyOptional({
    description: 'Detailed symptoms reported by the patient',
    nullable: true,
    example: 'Throbbing pain on left side of head, mild sensitivity to bright light.',
  })
  public symptoms?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Onset duration of reported symptoms',
    nullable: true,
    example: 'Started 10 days ago',
  })
  public symptomOnset?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Reported current medications',
    nullable: true,
    example: 'Ibuprofen 400mg PRN',
  })
  public currentMedications?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Reported allergies',
    nullable: true,
    example: 'Penicillin',
  })
  public allergies?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Additional personal questions or notes for the doctor',
    nullable: true,
    example: 'Would like to discuss further diagnostic imaging.',
  })
  public patientNotes?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when the intake was finalized and submitted (ISO 8601 string)',
    nullable: true,
    example: '2026-10-01T09:30:00.000Z',
  })
  public submittedAt?: string | null | undefined;

  @ApiProperty({
    description: 'Intake creation timestamp',
    example: '2026-10-01T09:15:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Intake last update timestamp',
    example: '2026-10-01T09:30:00.000Z',
  })
  public updatedAt!: string;
}
