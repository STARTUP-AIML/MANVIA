/**
 * Phase 7: Availability Slot Calculation Utility
 * Strictly respects backend availability rules:
 * - Checks doctor's published availability window (PatientDoctorAvailabilityResponseDto)
 * - Weekdays: SUNDAY..SATURDAY
 * - Start & End time in "HH:mm" format (in UTC or doctor's timezone)
 * - Slices into slots based on offer duration (durationMinutes)
 * - Verifies slot is in future (beyond current time)
 */

import type { DoctorAvailabilityWindow, DoctorConsultationOffer, DayOfWeek } from '../types/doctors.js';
import type { CalculatedTimeSlot } from '../types/appointments.js';

const WEEKDAYS: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

/**
 * Format a Date to YYYY-MM-DD
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Check whether a given date has active availability windows
 */
export function isDateAvailableForDoctor(
  date: Date,
  availabilityWindows: DoctorAvailabilityWindow[]
): boolean {
  if (!availabilityWindows || availabilityWindows.length === 0) {
    // If no availability windows are defined, backend permits appointments on any upcoming day
    return true;
  }

  // The backend uses UTC day of week:
  // const slotDayOfWeek = weekdays[startAt.getUTCDay()];
  const dayName = WEEKDAYS[date.getUTCDay()];
  return availabilityWindows.some((w) => w.dayOfWeek === dayName);
}

/**
 * Parses "HH:mm" to minutes from 00:00
 */
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats minutes from 00:00 to 12-hour "hh:mm AM/PM"
 */
function formatMinutesToTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Generates discrete time slots for a given date, doctor availability, and consultation offer.
 */
export function generateAvailableSlots(
  selectedDate: Date,
  availabilityWindows: DoctorAvailabilityWindow[],
  offer: DoctorConsultationOffer,
  now: Date = new Date()
): CalculatedTimeSlot[] {
  const duration = Math.max(15, offer.durationMinutes || 30);
  const slots: CalculatedTimeSlot[] = [];

  // Determine active schedules for this day
  const dayOfWeek = WEEKDAYS[selectedDate.getUTCDay()];
  const dayWindows = (availabilityWindows || []).filter((w) => w.dayOfWeek === dayOfWeek);

  // If doctor has schedules, generate slots within each window
  if (dayWindows.length > 0) {
    for (const window of dayWindows) {
      const startMinutes = parseTimeToMinutes(window.startTime);
      const endMinutes = parseTimeToMinutes(window.endTime);

      for (let time = startMinutes; time + duration <= endMinutes; time += duration) {
        const slotStart = new Date(selectedDate);
        slotStart.setUTCHours(Math.floor(time / 60), time % 60, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        // Slot must be in future (backend validateStartTimestamp requires startAt > now)
        const isFuture = slotStart.getTime() > now.getTime();

        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          displayTime: formatMinutesToTime(time),
          displayEndTime: formatMinutesToTime(time + duration),
          status: 'AVAILABLE',
          isBookable: isFuture,
        });
      }
    }
  } else if (!availabilityWindows || availabilityWindows.length === 0) {
    // If no schedule constraints exist, provide standard daytime slots (09:00 to 17:00 UTC)
    const defaultStart = 9 * 60; // 09:00 UTC
    const defaultEnd = 17 * 60; // 17:00 UTC

    for (let time = defaultStart; time + duration <= defaultEnd; time += duration) {
      const slotStart = new Date(selectedDate);
      slotStart.setUTCHours(Math.floor(time / 60), time % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      const isFuture = slotStart.getTime() > now.getTime();

      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        displayTime: formatMinutesToTime(time),
        displayEndTime: formatMinutesToTime(time + duration),
        status: 'AVAILABLE',
        isBookable: isFuture,
      });
    }
  }

  return slots;
}
