import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAIRealtimeSessionDto {
  @ApiPropertyOptional({
    description: 'Requested model version for realtime streaming',
    example: 'realtime-companion-v1',
    default: 'realtime-companion-v1',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  public model?: string;

  @ApiPropertyOptional({
    description: 'Supported modalities for realtime session',
    example: ['AUDIO', 'TEXT'],
  })
  @IsOptional()
  @IsArray()
  public modalities?: string[];

  @ApiPropertyOptional({
    description: 'Locale for session',
    example: 'en-US',
  })
  @IsOptional()
  @IsString()
  public locale?: string;
}
