import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({
    description: 'Internal appointment UUID or public appointment ID',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsString()
  @IsNotEmpty()
  public appointmentId!: string;

  @ApiPropertyOptional({
    description: 'Payment reference ID (simulated or Phase 19 gateway token)',
    example: 'pay_9988776655',
  })
  @IsString()
  @IsOptional()
  public paymentId?: string;

  @ApiProperty({
    description: 'Refund amount in major currency units (e.g. 120.00)',
    example: 120.0,
  })
  @IsNumber()
  @IsPositive()
  public amount!: number;

  @ApiPropertyOptional({
    description: 'Three-letter ISO currency code',
    default: 'USD',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  @MaxLength(3)
  public currency?: string;

  @ApiProperty({
    description: 'Reason for refund request',
    example: 'Cancelled within 24h window',
  })
  @IsString()
  @IsNotEmpty()
  public reason!: string;

  @ApiPropertyOptional({
    description: 'Idempotency key to prevent duplicate refund transactions',
    example: 'idem-cancellation-apt-1234',
  })
  @IsString()
  @IsOptional()
  public idempotencyKey?: string;
}
