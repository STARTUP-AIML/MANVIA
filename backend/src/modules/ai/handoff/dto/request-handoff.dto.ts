import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIHandoffUrgency } from '../handoff.enums.js';

export class RequestAIHandoffDto {
  @ApiPropertyOptional({
    description: 'Conversation identifier to associate with the handoff',
    example: 'AIC-7X9B2K5M',
  })
  @IsOptional()
  @IsString()
  public conversationId?: string;

  @ApiProperty({
    description: 'Reason for requesting human clinician handoff',
    example: 'Persistent headache requiring clinician review',
    maxLength: 128,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  public reason!: string;

  @ApiPropertyOptional({
    description: 'Requested urgency level',
    enum: AIHandoffUrgency,
    example: AIHandoffUrgency.ROUTINE,
    default: AIHandoffUrgency.ROUTINE,
  })
  @IsOptional()
  @IsEnum(AIHandoffUrgency)
  public requestedUrgency?: AIHandoffUrgency;

  @ApiPropertyOptional({
    description: 'Sanitized patient non-clinical summary',
    example: 'Patient experienced mild light sensitivity and requested routine doctor triage',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  public userSummary?: string;

  @ApiPropertyOptional({
    description:
      'Affirmative patient consent to share necessary wellness context with assigned clinician',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  public consentGranted?: boolean;
}
