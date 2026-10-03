import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../enums/appointment-status.enum.js';

export class AppointmentQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific appointment lifecycle status',
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  public status?: AppointmentStatus;

  @ApiPropertyOptional({
    description: 'Filter for upcoming appointments (startAt in the future)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  public upcoming?: boolean;

  @ApiPropertyOptional({
    description: 'Filter for past appointments (endAt in the past)',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  public past?: boolean;

  @ApiPropertyOptional({
    description: 'Filter appointments scheduled on or after this ISO 8601 date',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsISO8601()
  public startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter appointments scheduled on or before this ISO 8601 date',
    example: '2026-10-31',
  })
  @IsOptional()
  @IsISO8601()
  public endDate?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination (1-indexed)',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 1))
  @IsInt()
  @Min(1)
  public page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page size limit',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  public limit?: number = 20;
}
