import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({
    description: 'Provider payment or transaction reference ID',
    example: 'sim_pay_99887766',
  })
  @IsString()
  @IsNotEmpty()
  public providerPaymentId!: string;

  @ApiPropertyOptional({
    description: 'Provider signature for cryptographic verification',
    example: 'sig_abc123xyz',
  })
  @IsString()
  @IsOptional()
  public signature?: string;

  @ApiPropertyOptional({
    description: 'Raw payload from client SDK if needed for verification',
  })
  @IsOptional()
  public rawPayload?: Record<string, unknown>;
}
