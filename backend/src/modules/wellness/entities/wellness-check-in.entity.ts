export interface WellnessCheckInEntity {
  id: string;
  patientId: string;
  mood: number; // 1-5 scale (1: Very Low, 2: Low, 3: Fair, 4: Good, 5: Excellent)
  stress: number; // 1-5 scale (1: Very Low, 2: Low, 3: Moderate, 4: High, 5: Very High)
  energy: number; // 1-5 scale (1: Very Low, 2: Low, 3: Moderate, 4: High, 5: Very High)
  sleepQuality: number; // 1-5 scale (1: Very Poor, 2: Poor, 3: Fair, 4: Good, 5: Excellent)
  sleepDurationMinutes?: number | null; // Optional recorded duration in minutes (0-1440)
  note?: string | null; // Optional personal journal entry
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
