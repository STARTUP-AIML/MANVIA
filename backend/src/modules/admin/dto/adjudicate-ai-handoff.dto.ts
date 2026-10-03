import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AIHandoffStatus } from '@prisma/client';

export class AdjudicateAIHandoffDto {
  @ApiProperty({
    enum: AIHandoffStatus,
    description: 'Updated state for the human handoff entry',
    example: AIHandoffStatus.ASSIGNED,
  })
  @IsNotEmpty()
  @IsEnum(AIHandoffStatus)
  public status!: AIHandoffStatus;

  @ApiPropertyOptional({
    description: 'Optional assigned doctor UUID if reassigning or fulfilling the clinical handoff',
    example: 'd0000000-0000-0000-0000-000000000001',
  })
  @IsOptional()
  @IsUUID()
  public assignedDoctorId?: string;

  @ApiProperty({
    description: 'Administrative / clinical triage notes explaining the action taken',
    example: 'Triaged and routed to on-duty specialist Dr. Sharma for immediate review.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  public adminNotes!: string;
}
