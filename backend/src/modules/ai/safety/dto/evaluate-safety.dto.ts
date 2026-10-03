import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluateSafetyDto {
  @ApiProperty({
    description: 'Text to evaluate for safety boundaries, crisis, or emergency escalation',
    example: 'I feel sudden severe chest pain and dizziness',
  })
  @IsString()
  @MinLength(1)
  public text!: string;

  @ApiPropertyOptional({
    description: 'Locale for regional emergency routing and disclaimers',
    example: 'en-US',
    default: 'en-US',
  })
  @IsOptional()
  @IsString()
  public locale?: string;
}
