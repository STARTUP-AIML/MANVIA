import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class KillSwitchDto {
  @ApiProperty({
    description:
      'Subsystem identifier (e.g. REALTIME_VOICE_GATEWAY, AI_COMPANION, PAYMENTS_GATEWAY, NOTIFICATIONS_DISPATCH, APPOINTMENT_BOOKING)',
    example: 'REALTIME_VOICE_GATEWAY',
  })
  @IsNotEmpty()
  @IsString()
  public subsystem!: string;

  @ApiProperty({
    description:
      'Target operational state for the subsystem (true = active, false = disabled/kill-switch engaged)',
    example: false,
  })
  @IsNotEmpty()
  @IsBoolean()
  public enabled!: boolean;

  @ApiProperty({
    description:
      'Mandatory technical or operational justification for changing the subsystem state',
    example: 'Upstream voice provider experiencing elevated 502 Bad Gateway error rate',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  public justification!: string;
}
