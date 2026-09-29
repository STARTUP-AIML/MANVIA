export interface PreviousPeriodComparison {
  previousTotalCheckIns: number;
  moodDelta: number | null;
  stressDelta: number | null;
  energyDelta: number | null;
  sleepQualityDelta: number | null;
  sleepDurationMinutesDelta: number | null;
}

export interface WellnessTrendEntity {
  period: string; // '7d' | '30d' | '90d' | 'custom'
  startDate: Date;
  endDate: Date;
  totalCheckIns: number;
  hasSufficientData: boolean; // true if totalCheckIns >= 3, false otherwise
  averageMood: number | null;
  averageStress: number | null;
  averageEnergy: number | null;
  averageSleepQuality: number | null;
  averageSleepDurationMinutes: number | null;
  previousPeriodComparison?: PreviousPeriodComparison | null;
  descriptiveInsights: string[]; // Strictly non-diagnostic descriptive statements
}
