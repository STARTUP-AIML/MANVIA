import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '../enums/day-of-week.enum.js';

export class CreateAvailabilityDto {
  @ApiProperty({
    description: 'Authoritative IANA timezone identifier representing the physician local time',
    example: 'America/New_York',
  })
  @IsString()
  @IsNotEmpty()
  timezone!: string;

  @ApiProperty({
    description: 'Day of the week for recurring availability window',
    enum: DayOfWeek,
    example: DayOfWeek.MONDAY,
  })
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @ApiProperty({
    description: '24-hour clock start time in HH:mm format',
    example: '09:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be a valid 24-hour clock time in HH:mm format (e.g. 09:00, 14:30)',
  })
  startTime!: string;

  @ApiProperty({
    description: '24-hour clock end time in HH:mm format',
    example: '13:00',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be a valid 24-hour clock time in HH:mm format (e.g. 13:00, 18:00)',
  })
  endTime!: string;

  @ApiPropertyOptional({
    description: 'Optional beginning date from which this availability rule takes effect',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string | undefined;

  @ApiPropertyOptional({
    description: 'Optional expiry date until which this availability rule remains valid',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  effectiveUntil?: string | undefined;

  @ApiPropertyOptional({
    description: 'Whether this recurring availability rule is currently active',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean | undefined = true;
}
