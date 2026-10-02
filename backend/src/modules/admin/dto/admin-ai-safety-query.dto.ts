import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { AISafetyClassification, AISafetyAction } from '@prisma/client';

export class AdminAISafetyQueryDto {
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
    enum: AISafetyClassification,
    description: 'Filter by safety classification',
  })
  @IsOptional()
  @IsEnum(AISafetyClassification)
  public classification?: AISafetyClassification;

  @ApiPropertyOptional({ enum: AISafetyAction, description: 'Filter by action taken' })
  @IsOptional()
  @IsEnum(AISafetyAction)
  public actionTaken?: AISafetyAction;

  @ApiPropertyOptional({ description: 'Filter by user UUID' })
  @IsOptional()
  @IsUUID()
  public userId?: string;
}
