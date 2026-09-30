import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DeclineOfferDto {
  @ApiPropertyOptional({
    description: 'Optional reason for declining the waitlist slot offer',
    maxLength: 500,
    example: 'Cannot make this time slot.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  public reason?: string;
}
