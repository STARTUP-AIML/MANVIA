import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RevokeConsentDto {
  @ApiPropertyOptional({
    description: 'Patient-provided reason for consent revocation',
    example: 'Consultation completed; access no longer needed',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public reason?: string;
}
