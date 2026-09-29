import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType } from '../enums/consultation-type.enum.js';
import { DayOfWeek } from '../enums/day-of-week.enum.js';

export class PatientDoctorOfferResponseDto {
  @ApiProperty({
    description: 'Unique offer identifier for booking reference in Phase 13',
    example: 'c1b2c3d4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Title of consultation service',
    example: '30-Minute General Consultation',
  })
  title!: string;

  @ApiPropertyOptional({
    description: 'Consultation description',
    example: 'Evaluation and prescription review.',
  })
  description!: string | null;

  @ApiProperty({
    description: 'Type of medical consultation',
    enum: ConsultationType,
    example: ConsultationType.GENERAL,
  })
  consultationType!: ConsultationType;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 30,
  })
  durationMinutes!: number;

  @ApiProperty({
    description: 'Consultation fee',
    example: 75.0,
  })
  fee!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency!: string;
}

export class PatientDoctorAvailabilityResponseDto {
  @ApiProperty({
    description: 'Unique availability window identifier',
    example: 'a1b2c3d4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Doctor local IANA timezone',
    example: 'America/New_York',
  })
  timezone!: string;

  @ApiProperty({
    description: 'Day of week',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  dayOfWeek!: DayOfWeek;

  @ApiProperty({
    description: 'Window start time (24-hour HH:mm)',
    example: '09:00',
  })
  startTime!: string;

  @ApiProperty({
    description: 'Window end time (24-hour HH:mm)',
    example: '13:00',
  })
  endTime!: string;
}
