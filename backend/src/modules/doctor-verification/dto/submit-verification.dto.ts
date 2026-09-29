import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitVerificationDto {
  @ApiPropertyOptional({
    description: 'Optional submission notes or remarks provided by the doctor for the reviewer',
    maxLength: 1000,
    example: 'Updated license details for annual verification.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | undefined;
}
