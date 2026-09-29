import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveVerificationDto {
  @ApiPropertyOptional({
    description: 'Internal administrative notes documenting the verification decision and findings',
    maxLength: 1000,
    example: 'Credentials verified against State Medical Council Registry on 2026-09-29.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | undefined;
}
