/**
 * Authoritative Wellness Types — Matched directly to MANVIA Backend DTOs
 * Backend path: backend/src/modules/wellness/dto/
 */

export interface WellnessCheckInResponse {
  id: string;
  patientId: string;
  mood: number; // 1-5 scale
  stress: number; // 1-5 scale
  energy: number; // 1-5 scale
  sleepQuality: number; // 1-5 scale
  sleepDurationMinutes?: number | null;
  note?: string | null;
  recordedAt: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateWellnessCheckInRequest {
  mood: number; // 1-5 integer
  stress: number; // 1-5 integer
  energy: number; // 1-5 integer
  sleepQuality: number; // 1-5 integer
  sleepDurationMinutes?: number; // 0-1440
  sleepHours?: number; // 0-24
  note?: string; // Max 2000 chars
  recordedAt?: string; // ISO 8601
}

export interface UpdateWellnessCheckInRequest {
  mood?: number;
  stress?: number;
  energy?: number;
  sleepQuality?: number;
  sleepDurationMinutes?: number;
  sleepHours?: number;
  note?: string;
  recordedAt?: string;
}

export interface PaginatedWellnessCheckInsResponse {
  data: WellnessCheckInResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WellnessSummaryResponse {
  latestCheckIn: WellnessCheckInResponse | null;
  todayCheckIn: WellnessCheckInResponse | null;
  streakDays: number;
  totalCheckIns: number;
}

export interface PreviousPeriodComparison {
  previousTotalCheckIns: number;
  moodDelta?: number | null;
  stressDelta?: number | null;
  energyDelta?: number | null;
  sleepQualityDelta?: number | null;
  sleepDurationMinutesDelta?: number | null;
}

export interface WellnessTrendsResponse {
  period: string; // '7d' | '30d' | '90d' | 'custom'
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  totalCheckIns: number;
  hasSufficientData: boolean;
  averageMood?: number | null;
  averageStress?: number | null;
  averageEnergy?: number | null;
  averageSleepQuality?: number | null;
  averageSleepDurationMinutes?: number | null;
  previousPeriodComparison?: PreviousPeriodComparison | null;
  descriptiveInsights: string[];
}

export interface WellnessQueryParams {
  page?: number;
  limit?: number;
  period?: 'today' | '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
  timezone?: string;
}

export interface WellnessTrendsQueryParams {
  period?: '7d' | '30d' | '90d' | 'custom';
  startDate?: string;
  endDate?: string;
  timezone?: string;
}
