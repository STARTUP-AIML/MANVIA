import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';
import { SlotReservationState } from '../enums/slot-reservation-state.enum.js';
import { PreConsultationStatus } from '../enums/pre-consultation-status.enum.js';
import { PreConsultationResponseDto } from './pre-consultation-response.dto.js';

export class AppointmentResponseDto {
  @ApiProperty({
    description: 'Internal unique appointment UUID',
    example: 'd9b07384-d113-4944-9c87-8321e0028a7b',
  })
  public id!: string;

  @ApiProperty({
    description: 'Public, non-sequential appointment identifier (APT-XXXXXXXX)',
    example: 'APT-7492ABCD',
  })
  public publicAppointmentId!: string;

  @ApiProperty({
    description: 'Internal UUID of the patient profile',
    example: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  })
  public patientId!: string;

  @ApiPropertyOptional({
    description: 'Public patient identifier (PAT-XXXXXXXX)',
    example: 'PAT-83749201',
  })
  public publicPatientId?: string | undefined;

  @ApiProperty({
    description: 'Internal UUID of the doctor profile',
    example: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
  })
  public doctorId!: string;

  @ApiPropertyOptional({
    description: 'Public doctor identifier (DOC-XXXXXXXX)',
    example: 'DOC-12345678',
  })
  public publicDoctorId?: string | undefined;

  @ApiPropertyOptional({
    description: 'Physician display name',
    example: 'Dr. Gregory House, MD',
  })
  public doctorDisplayName?: string | undefined;

  @ApiProperty({
    description: 'Internal UUID of the ConsultationOffer',
    example: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  })
  public consultationOfferId!: string;

  @ApiPropertyOptional({
    description: 'Title of the selected consultation offer',
    example: 'General Video Consultation',
  })
  public offerTitle?: string | undefined;

  @ApiPropertyOptional({
    description: 'Duration of the appointment in minutes',
    example: 30,
  })
  public durationMinutes?: number | undefined;

  @ApiPropertyOptional({
    description: 'Consultation fee amount',
    example: 75.0,
  })
  public fee?: number | undefined;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'USD',
  })
  public currency?: string | undefined;

  @ApiProperty({
    description: 'Scheduled start timestamp (ISO 8601 string)',
    example: '2026-10-05T14:00:00.000Z',
  })
  public startAt!: string;

  @ApiProperty({
    description: 'Scheduled end timestamp (ISO 8601 string)',
    example: '2026-10-05T14:30:00.000Z',
  })
  public endAt!: string;

  @ApiProperty({
    description: 'Current lifecycle status of the appointment',
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  public status!: AppointmentStatus;

  @ApiProperty({
    description: 'Slot availability reservation state',
    enum: SlotReservationState,
    example: SlotReservationState.BOOKED,
  })
  public reservationState!: SlotReservationState;

  @ApiPropertyOptional({
    description: 'Temporary slot hold expiration timestamp (ISO 8601)',
    nullable: true,
    example: '2026-10-05T13:45:00.000Z',
  })
  public reservedUntil?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Reason for cancellation if cancelled',
    nullable: true,
    example: 'Patient schedule conflict',
  })
  public cancellationReason?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when appointment was cancelled',
    nullable: true,
  })
  public cancelledAt?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'User ID of the party that initiated cancellation',
    nullable: true,
  })
  public cancelledBy?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Reason provided by physician if declined',
    nullable: true,
  })
  public declineReason?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when physician declined the appointment',
    nullable: true,
  })
  public declinedAt?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when physician confirmed the appointment',
    nullable: true,
  })
  public confirmedAt?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when consultation session was started',
    nullable: true,
  })
  public startedAt?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when consultation session was completed',
    nullable: true,
  })
  public completedAt?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Timestamp when appointment was marked as no-show',
    nullable: true,
  })
  public noShowAt?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'General notes provided upon booking',
    nullable: true,
  })
  public notes?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Whether a pre-consultation intake exists for this appointment',
    example: true,
  })
  public hasPreConsultation?: boolean | undefined;

  @ApiPropertyOptional({
    description: 'Completion status of pre-consultation intake',
    enum: PreConsultationStatus,
    nullable: true,
  })
  public preConsultationStatus?: PreConsultationStatus | null | undefined;

  @ApiPropertyOptional({
    description: 'Associated pre-consultation intake if requested and authorized',
    type: () => PreConsultationResponseDto,
    nullable: true,
  })
  public preConsultation?: PreConsultationResponseDto | null | undefined;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-10-01T10:00:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-10-01T10:05:00.000Z',
  })
  public updatedAt!: string;
}

export class PaginatedAppointmentsResponseDto {
  @ApiProperty({
    description: 'List of appointment response objects',
    type: [AppointmentResponseDto],
  })
  public data!: AppointmentResponseDto[];

  @ApiProperty({ description: 'Total count of appointments matching criteria', example: 5 })
  public total!: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  public page!: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  public limit!: number;

  @ApiProperty({ description: 'Total available pages', example: 1 })
  public totalPages!: number;
}
