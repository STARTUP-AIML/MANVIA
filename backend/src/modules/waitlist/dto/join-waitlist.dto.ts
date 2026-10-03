import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinWaitlistDto {
  @ApiProperty({
    description: 'Internal doctor UUID or public doctor ID (DOC-XXXXXXXX)',
    example: 'DOC-55443322',
  })
  @IsString()
  @IsNotEmpty()
  public doctorId!: string;

  @ApiPropertyOptional({
    description: 'Consultation offer UUID',
    example: 'b0000000-0000-0000-0000-000000000001',
  })
  @IsString()
  @IsOptional()
  public consultationOfferId?: string;

  @ApiPropertyOptional({
    description: 'Earliest preferred start timestamp (ISO 8601)',
    example: '2026-10-05T08:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  public preferredStartDate?: string;

  @ApiPropertyOptional({
    description: 'Latest preferred end timestamp (ISO 8601)',
    example: '2026-10-12T18:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  public preferredEndDate?: string;

  @ApiPropertyOptional({
    description: 'Priority score (0 = standard, higher = elevated/urgent triage)',
    default: 0,
    example: 0,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  public priority?: number;

  @ApiPropertyOptional({
    description: 'Optional scheduling notes or preferences',
    maxLength: 500,
    example: 'Prefer mornings after 9 AM if possible.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  public notes?: string;
}
