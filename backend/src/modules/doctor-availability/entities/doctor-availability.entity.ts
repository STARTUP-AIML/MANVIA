import type { DayOfWeek } from '../enums/day-of-week.enum.js';

export interface DoctorAvailabilityEntity {
  id: string;
  doctorId: string;
  timezone: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
