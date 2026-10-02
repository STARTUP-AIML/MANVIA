import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CareRelationshipStatus } from '@prisma/client';

export class AdminCareRelationshipQueryDto {
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

  @ApiPropertyOptional({
    enum: CareRelationshipStatus,
    description: 'Filter by relationship status',
  })
  @IsOptional()
  @IsEnum(CareRelationshipStatus)
  public status?: CareRelationshipStatus;

  @ApiPropertyOptional({ description: 'Filter by doctor UUID' })
  @IsOptional()
  @IsUUID()
  public doctorId?: string;

  @ApiPropertyOptional({ description: 'Filter by patient UUID' })
  @IsOptional()
  @IsUUID()
  public patientId?: string;
}
