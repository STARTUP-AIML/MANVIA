import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Internal appointment UUID or public appointment ID',
    example: 'a0000000-0000-0000-0000-000000000001',
  })
  @IsString()
  @IsNotEmpty()
  public appointmentId!: string;

  @ApiPropertyOptional({
    description: 'Payment provider identifier (e.g. simulated, razorpay, stripe)',
    default: 'simulated',
    example: 'simulated',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  public provider?: string;

  @ApiPropertyOptional({
    description: 'Client-provided idempotency key',
    example: 'idem-pay-123456',
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  public idempotencyKey?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata',
  })
  @IsOptional()
  public metadata?: Record<string, unknown>;
}
