import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectVerificationDto {
  @ApiProperty({
    description:
      'Mandatory, explicit reason for rejection visible to the physician for remediation',
    minLength: 5,
    maxLength: 1000,
    example: 'Medical license certificate has expired. Please upload valid current license.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;

  @ApiPropertyOptional({
    description: 'Internal administrative notes not disclosed to the physician',
    maxLength: 1000,
    example: 'Registry check returned inactive status.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | undefined;
}
