import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specialty code or name (e.g. CARDIO or Cardiology)',
    example: 'Cardiology',
  })
  @IsOptional()
  @IsString()
  specialty?: string | undefined;

  @ApiPropertyOptional({
    description: 'Filter by language code or name (e.g. en or English)',
    example: 'English',
  })
  @IsOptional()
  @IsString()
  language?: string | undefined;

  @ApiPropertyOptional({
    description: 'Number of records to return',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
