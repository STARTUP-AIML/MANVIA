import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';

export class VerificationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter submissions by verification status (e.g. PENDING_REVIEW)',
    enum: DoctorVerificationStatus,
    example: DoctorVerificationStatus.PENDING_REVIEW,
  })
  @IsOptional()
  @IsEnum(DoctorVerificationStatus)
  status?: DoctorVerificationStatus | undefined;

  @ApiPropertyOptional({
    description: 'Number of records to return (1-100)',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number | undefined = 20;

  @ApiPropertyOptional({
    description: 'Number of records to skip for pagination',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number | undefined = 0;
}
