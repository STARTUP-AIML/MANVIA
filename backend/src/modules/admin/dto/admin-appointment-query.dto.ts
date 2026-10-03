import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class AdminAppointmentQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  public page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  public limit?: number = 20;

  @ApiPropertyOptional({ enum: AppointmentStatus, description: 'Filter by appointment status' })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  public status?: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Filter by doctor UUID' })
  @IsOptional()
  @IsUUID()
  public doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by patient UUID' })
  @IsOptional()
  @IsUUID()
  public patientId?: string;

  @ApiPropertyOptional({ description: 'Filter appointments scheduled on or after this ISO date' })
  @IsOptional()
  @IsDateString()
  public startDate?: string;

  @ApiPropertyOptional({ description: 'Filter appointments scheduled on or before this ISO date' })
  @IsOptional()
  @IsDateString()
  public endDate?: string;
}
