import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelAppointmentDto {
  @ApiProperty({
    description: 'Reason for cancelling the appointment',
    minLength: 3,
    maxLength: 500,
    example: 'Schedule conflict with urgent personal matter.',
  })
  @IsString({ message: 'reason must be a string' })
  @IsNotEmpty({ message: 'reason cannot be empty' })
  @MinLength(3, { message: 'reason must be at least 3 characters' })
  @MaxLength(500, { message: 'reason cannot exceed 500 characters' })
  public reason!: string;

  @ApiPropertyOptional({
    description:
      'Structured reason classification code (e.g. PATIENT_SCHEDULE_CONFLICT, EMERGENCY)',
    example: 'SCHEDULE_CONFLICT',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  public reasonCode?: string;

  @ApiPropertyOptional({
    description: 'Whether to request a refund according to policy (default: true)',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  public requestRefund?: boolean;
}
