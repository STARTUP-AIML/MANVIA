import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WellnessCheckInResponseDto } from './wellness-check-in-response.dto.js';

export class WellnessSummaryResponseDto {
  @ApiPropertyOptional({
    description: 'The most recent wellness check-in record for the patient, or null',
    type: WellnessCheckInResponseDto,
    nullable: true,
  })
  public latestCheckIn!: WellnessCheckInResponseDto | null;

  @ApiPropertyOptional({
    description: "Wellness check-in recorded for today in the patient's local date, or null",
    type: WellnessCheckInResponseDto,
    nullable: true,
  })
  public todayCheckIn!: WellnessCheckInResponseDto | null;

  @ApiProperty({
    description: 'Consecutive days streak of recording at least one wellness check-in',
    example: 5,
  })
  public streakDays!: number;

  @ApiProperty({
    description: 'Total lifetime check-ins logged by this patient',
    example: 38,
  })
  public totalCheckIns!: number;
}
