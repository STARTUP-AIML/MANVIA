import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class AdminAuditQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of audit records per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public limit?: number = 50;

  @ApiPropertyOptional({ description: 'Filter by actor User UUID' })
  @IsOptional()
  @IsUUID()
  public actorUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by audit action name (e.g. AUTH.LOGIN, ADMIN.USER_STATUS_UPDATED)',
  })
  @IsOptional()
  @IsString()
  public action?: string;

  @ApiPropertyOptional({
    description: 'Filter by affected resource type (e.g. USER, PATIENT_PROFILE, DOCTOR_PROFILE)',
  })
  @IsOptional()
  @IsString()
  public resourceType?: string;

  @ApiPropertyOptional({ description: 'Filter by affected resource ID' })
  @IsOptional()
  @IsString()
  public resourceId?: string;

  @ApiPropertyOptional({ description: 'Filter by status (e.g. SUCCESS, FAILURE)' })
  @IsOptional()
  @IsString()
  public status?: string;

  @ApiPropertyOptional({ description: 'Filter records created on or after this ISO date' })
  @IsOptional()
  @IsDateString()
  public startDate?: string;

  @ApiPropertyOptional({ description: 'Filter records created on or before this ISO date' })
  @IsOptional()
  @IsDateString()
  public endDate?: string;
}
