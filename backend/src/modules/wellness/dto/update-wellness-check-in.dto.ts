import {
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateWellnessCheckInDto {
  @ApiPropertyOptional({
    description: 'Subjective mood score on a 1–5 non-clinical scale (1: Very Low, 5: Excellent)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @Transform(({ value, obj }) => value ?? obj.moodScore)
  @IsOptional()
  @IsInt({ message: 'mood must be an integer between 1 and 5' })
  @Min(1, { message: 'mood must be at least 1' })
  @Max(5, { message: 'mood cannot exceed 5' })
  public mood?: number;

  @ApiPropertyOptional({
    description: 'Subjective stress score on a 1–5 non-clinical scale (1: Very Low, 5: Very High)',
    minimum: 1,
    maximum: 5,
    example: 2,
  })
  @Transform(({ value, obj }) => value ?? obj.stressScore)
  @IsOptional()
  @IsInt({ message: 'stress must be an integer between 1 and 5' })
  @Min(1, { message: 'stress must be at least 1' })
  @Max(5, { message: 'stress cannot exceed 5' })
  public stress?: number;

  @ApiPropertyOptional({
    description: 'Subjective energy score on a 1–5 non-clinical scale (1: Very Low, 5: Very High)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @Transform(({ value, obj }) => value ?? obj.energyScore)
  @IsOptional()
  @IsInt({ message: 'energy must be an integer between 1 and 5' })
  @Min(1, { message: 'energy must be at least 1' })
  @Max(5, { message: 'energy cannot exceed 5' })
  public energy?: number;

  @ApiPropertyOptional({
    description:
      'Subjective sleep quality score on a 1–5 non-clinical scale (1: Very Poor, 5: Excellent)',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsInt({ message: 'sleepQuality must be an integer between 1 and 5' })
  @Min(1, { message: 'sleepQuality must be at least 1' })
  @Max(5, { message: 'sleepQuality cannot exceed 5' })
  public sleepQuality?: number;

  @ApiPropertyOptional({
    description: 'Duration of sleep recorded in minutes (0 to 1440)',
    minimum: 0,
    maximum: 1440,
    example: 450,
  })
  @Transform(({ value, obj }) => {
    if (value !== undefined && value !== null) return value;
    if (obj.sleepHours !== undefined && obj.sleepHours !== null) {
      return Math.round(Number(obj.sleepHours) * 60);
    }
    return undefined;
  })
  @IsOptional()
  @IsInt({ message: 'sleepDurationMinutes must be an integer between 0 and 1440' })
  @Min(0, { message: 'sleepDurationMinutes cannot be negative' })
  @Max(1440, { message: 'sleepDurationMinutes cannot exceed 1440 (24 hours)' })
  public sleepDurationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Alternative representation: Duration of sleep in hours (0.0 to 24.0)',
    minimum: 0,
    maximum: 24,
    example: 7.5,
  })
  @IsOptional()
  @IsNumber({}, { message: 'sleepHours must be a number between 0 and 24' })
  @Min(0, { message: 'sleepHours cannot be negative' })
  @Max(24, { message: 'sleepHours cannot exceed 24' })
  public sleepHours?: number;

  @ApiPropertyOptional({
    description:
      'Optional personal reflection or non-diagnostic journal note (maximum 2000 characters)',
    maxLength: 2000,
    example: 'Updated note after evening walk.',
  })
  @Transform(({ value, obj }) => value ?? obj.journalReflection)
  @IsOptional()
  @IsString({ message: 'note must be a string' })
  @MaxLength(2000, { message: 'note cannot exceed 2000 characters' })
  public note?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when check-in was recorded (ISO 8601 string, defaults to current time)',
    example: '2026-09-29T10:00:00.000Z',
  })
  @Transform(({ value, obj }) => value ?? obj.loggedAt)
  @IsOptional()
  @IsISO8601({}, { message: 'recordedAt must be a valid ISO 8601 date string' })
  public recordedAt?: string;
}
