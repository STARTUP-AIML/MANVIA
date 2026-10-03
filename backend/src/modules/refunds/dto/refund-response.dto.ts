import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '../enums/refund-status.enum.js';

export class RefundResponseDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'REF-7K9M2L4P' })
  public publicRefundId!: string;

  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000002' })
  public appointmentId!: string;

  @ApiPropertyOptional({ example: 'pay_9988776655' })
  public paymentId!: string | null;

  @ApiProperty({ example: 120.0 })
  public amount!: number;

  @ApiProperty({ example: 'USD' })
  public currency!: string;

  @ApiProperty({ example: 'Cancelled within 24h window' })
  public reason!: string;

  @ApiProperty({ enum: RefundStatus, example: RefundStatus.SUCCEEDED })
  public status!: RefundStatus;

  @ApiPropertyOptional({ example: 'idem-cancellation-apt-1234' })
  public idempotencyKey!: string | null;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public requestedAt!: string;

  @ApiPropertyOptional({ example: '2026-10-01T12:00:01.000Z' })
  public processedAt!: string | null;

  @ApiPropertyOptional({ example: null })
  public failureReason!: string | null;

  @ApiPropertyOptional({ example: 'sim_ref_987654321' })
  public providerReference!: string | null;

  @ApiPropertyOptional({ example: null })
  public metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-10-01T12:00:01.000Z' })
  public updatedAt!: string;
}

export class PaginatedRefundsResponseDto {
  @ApiProperty({ type: [RefundResponseDto] })
  public data!: RefundResponseDto[];

  @ApiProperty({ example: 1 })
  public total!: number;

  @ApiProperty({ example: 1 })
  public page!: number;

  @ApiProperty({ example: 20 })
  public limit!: number;

  @ApiProperty({ example: 1 })
  public totalPages!: number;
}
