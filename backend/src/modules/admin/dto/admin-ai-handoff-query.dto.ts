import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AIHandoffStatus, AIHandoffUrgency } from '@prisma/client';

export class AdminAIHandoffQueryDto {
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

  @ApiPropertyOptional({ enum: AIHandoffStatus, description: 'Filter by handoff status' })
  @IsOptional()
  @IsEnum(AIHandoffStatus)
  public status?: AIHandoffStatus;

  @ApiPropertyOptional({ enum: AIHandoffUrgency, description: 'Filter by requested urgency' })
  @IsOptional()
  @IsEnum(AIHandoffUrgency)
  public urgency?: AIHandoffUrgency;

  @ApiPropertyOptional({ description: 'Filter by assigned doctor UUID' })
  @IsOptional()
  @IsUUID()
  public doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by user UUID' })
  @IsOptional()
  @IsUUID()
  public userId?: string;
}
