import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundResponseDto } from '../../refunds/dto/refund-response.dto.js';

export class CancellationPolicyResultDto {
  @ApiProperty({ example: true })
  public allowed!: boolean;

  @ApiProperty({ example: 'FULL' })
  public refundEligibility!: string;

  @ApiProperty({ example: 'FULL_REFUND_ADVANCE_NOTICE' })
  public refundType!: string;

  @ApiProperty({ example: 120.0 })
  public refundableAmount!: number;

  @ApiProperty({ example: 0.0 })
  public cancellationFee!: number;

  @ApiProperty({ example: 'Cancelled 48.0h prior; 100% refund.' })
  public reason!: string;

  @ApiProperty({ example: 'v1.0.0-phase14' })
  public policyVersion!: string;
}

export class CancellationDetailsResponseDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000002' })
  public appointmentId!: string;

  @ApiProperty({ example: 'APT-18294719' })
  public publicAppointmentId!: string;

  @ApiProperty({ example: 'PAT-48291048' })
  public cancelledBy!: string;

  @ApiProperty({ example: 'PATIENT' })
  public cancellationActorType!: string;

  @ApiProperty({ example: 'Schedule conflict' })
  public reason!: string;

  @ApiPropertyOptional({ example: 'PERSONAL_CONFLICT' })
  public reasonCode!: string | null;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public cancelledAt!: string;

  @ApiPropertyOptional({ type: CancellationPolicyResultDto })
  public policyResult?: CancellationPolicyResultDto;

  @ApiPropertyOptional({ type: [RefundResponseDto] })
  public refunds?: RefundResponseDto[];
}
