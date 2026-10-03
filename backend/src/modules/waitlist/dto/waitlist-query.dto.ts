import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WaitlistStatus } from '../enums/waitlist-status.enum.js';

export class WaitlistQueryDto {
  @ApiPropertyOptional({ enum: WaitlistStatus })
  @IsEnum(WaitlistStatus)
  @IsOptional()
  public status?: WaitlistStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  public page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  public limit: number = 20;
}
