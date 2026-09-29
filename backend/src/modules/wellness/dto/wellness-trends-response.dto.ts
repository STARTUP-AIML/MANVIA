import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PreviousPeriodComparisonDto {
  @ApiProperty({
    description: 'Total check-ins logged during the previous baseline period',
    example: 7,
  })
  public previousTotalCheckIns!: number;

  @ApiPropertyOptional({
    description: 'Delta difference in average mood (current - previous)',
    example: 0.6,
    nullable: true,
  })
  public moodDelta!: number | null;

  @ApiPropertyOptional({
    description: 'Delta difference in average stress (current - previous)',
    example: -0.4,
    nullable: true,
  })
  public stressDelta!: number | null;

  @ApiPropertyOptional({
    description: 'Delta difference in average energy (current - previous)',
    example: 0.2,
    nullable: true,
  })
  public energyDelta!: number | null;

  @ApiPropertyOptional({
    description: 'Delta difference in average sleep quality (current - previous)',
    example: 0.5,
    nullable: true,
  })
  public sleepQualityDelta!: number | null;

  @ApiPropertyOptional({
    description: 'Delta difference in average sleep duration minutes (current - previous)',
    example: 30,
    nullable: true,
  })
  public sleepDurationMinutesDelta!: number | null;
}

export class WellnessTrendsResponseDto {
  @ApiProperty({ description: 'Analysis period identifier', example: '7d' })
  public period!: string;

  @ApiProperty({
    description: 'Start boundary of analysis window (ISO 8601)',
    example: '2026-09-22T00:00:00.000Z',
  })
  public startDate!: string;

  @ApiProperty({
    description: 'End boundary of analysis window (ISO 8601)',
    example: '2026-09-29T23:59:59.999Z',
  })
  public endDate!: string;

  @ApiProperty({ description: 'Total check-ins logged within analysis window', example: 6 })
  public totalCheckIns!: number;

  @ApiProperty({
    description:
      'Indicates whether sufficient data points exist (minimum 3 check-ins) to form a meaningful mathematical trend',
    example: true,
  })
  public hasSufficientData!: boolean;

  @ApiPropertyOptional({
    description: 'Average mood score on 1–5 non-clinical scale',
    example: 3.8,
    nullable: true,
  })
  public averageMood!: number | null;

  @ApiPropertyOptional({
    description: 'Average stress score on 1–5 non-clinical scale',
    example: 2.3,
    nullable: true,
  })
  public averageStress!: number | null;

  @ApiPropertyOptional({
    description: 'Average energy score on 1–5 non-clinical scale',
    example: 3.7,
    nullable: true,
  })
  public averageEnergy!: number | null;

  @ApiPropertyOptional({
    description: 'Average sleep quality score on 1–5 non-clinical scale',
    example: 4.1,
    nullable: true,
  })
  public averageSleepQuality!: number | null;

  @ApiPropertyOptional({
    description: 'Average recorded sleep duration in minutes',
    example: 440,
    nullable: true,
  })
  public averageSleepDurationMinutes!: number | null;

  @ApiPropertyOptional({
    description:
      'Mathematical delta comparison against the immediately preceding identical time window',
    type: PreviousPeriodComparisonDto,
    nullable: true,
  })
  public previousPeriodComparison!: PreviousPeriodComparisonDto | null;

  @ApiProperty({
    description:
      'Neutral, descriptive, non-diagnostic observational statements. Non-clinical and non-prescriptive.',
    type: [String],
    example: [
      'Your recorded mood average increased by 0.6 compared with the previous period.',
      'Your recorded stress level was lower on average compared with the previous period.',
    ],
  })
  public descriptiveInsights!: string[];
}
