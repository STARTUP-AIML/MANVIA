import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIHandoffStatus, AIHandoffUrgency } from '../handoff.enums.js';

export class AIHandoffResponseDto {
  @ApiProperty({
    description: 'Internal UUID of handoff request',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  public id!: string;

  @ApiProperty({
    description: 'Public non-sequential handoff ID',
    example: 'AIH-4P8M2K9Q',
  })
  public publicHandoffId!: string;

  @ApiProperty({
    description: 'User ID requesting handoff',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  public userId!: string;

  @ApiPropertyOptional({
    description: 'Associated conversation ID',
    nullable: true,
    example: 'AIC-7X9B2K5M',
  })
  public conversationId?: string | null;

  @ApiPropertyOptional({
    description: 'Assigned doctor profile ID',
    nullable: true,
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  public assignedDoctorId?: string | null;

  @ApiProperty({
    description: 'Reason for handoff',
    example: 'Persistent headache requiring clinician review',
  })
  public reason!: string;

  @ApiProperty({
    description: 'Safety triage level',
    example: 'ROUTINE',
  })
  public safetyLevel!: string;

  @ApiProperty({
    description: 'Requested urgency',
    enum: AIHandoffUrgency,
    example: AIHandoffUrgency.ROUTINE,
  })
  public requestedUrgency!: AIHandoffUrgency;

  @ApiProperty({
    description: 'Status of the handoff lifecycle',
    enum: AIHandoffStatus,
    example: AIHandoffStatus.REQUESTED,
  })
  public status!: AIHandoffStatus;

  @ApiPropertyOptional({
    description: 'Sanitized summary',
    nullable: true,
  })
  public userSummary?: string | null;

  @ApiProperty({
    description: 'Patient consent status to share minimal context',
    example: true,
  })
  public consentGranted!: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when doctor accepted handoff',
    nullable: true,
  })
  public acceptedAt?: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-09-29T21:00:00.000Z',
  })
  public createdAt!: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-09-29T21:00:00.000Z',
  })
  public updatedAt!: string;
}
