import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../enums/day-of-week.enum.js';

export class DoctorAvailabilityResponseDto {
  @ApiProperty({
    description: 'Unique availability rule identifier',
    example: 'a1b2c3d4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Authoritative IANA timezone identifier',
    example: 'America/New_York',
  })
  timezone!: string;

  @ApiProperty({
    description: 'Day of the week',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  dayOfWeek!: DayOfWeek;

  @ApiProperty({
    description: '24-hour clock start time',
    example: '09:00',
  })
  startTime!: string;

  @ApiProperty({
    description: '24-hour clock end time',
    example: '13:00',
  })
  endTime!: string;

  @ApiPropertyOptional({
    description: 'Beginning date for this rule',
    example: '2026-10-01',
  })
  effectiveFrom!: string | null;

  @ApiPropertyOptional({
    description: 'Expiry date for this rule',
    example: '2026-12-31',
  })
  effectiveUntil!: string | null;

  @ApiProperty({
    description: 'Whether this rule is active',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2026-09-29T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2026-09-29T10:00:00.000Z',
  })
  updatedAt!: string;
}
