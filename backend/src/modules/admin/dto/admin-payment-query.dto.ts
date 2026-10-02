import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class AdminPaymentQueryDto {
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

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter by payment status' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  public status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by payer user UUID' })
  @IsOptional()
  @IsUUID()
  public userId?: string;

  @ApiPropertyOptional({ description: 'Filter payments created on or after this ISO date' })
  @IsOptional()
  @IsDateString()
  public startDate?: string;

  @ApiPropertyOptional({ description: 'Filter payments created on or before this ISO date' })
  @IsOptional()
  @IsDateString()
  public endDate?: string;
}
