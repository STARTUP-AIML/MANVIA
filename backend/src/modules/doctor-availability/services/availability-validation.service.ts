import { Injectable } from '@nestjs/common';
import { ConflictError, ValidationError } from '../../../common/errors/app-error.js';
import type { DayOfWeek } from '../enums/day-of-week.enum.js';
import type { DoctorAvailabilityEntity } from '../entities/doctor-availability.entity.js';

@Injectable()
export class AvailabilityValidationService {
  /**
   * Validates that the provided timezone string is an authoritative IANA timezone identifier
   * (e.g. 'America/New_York', 'Asia/Kolkata', 'Europe/London', or 'UTC').
   * Disallows legacy 3-letter abbreviations such as 'IST', 'EST', or 'PST'.
   */
  public validateTimezone(timezone: string): void {
    if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
      throw new ValidationError('A valid IANA timezone identifier is required');
    }

    const trimmed = timezone.trim();
    const isIanaFormat =
      trimmed === 'UTC' || (trimmed.includes('/') && trimmed.split('/').length >= 2);

    if (!isIanaFormat) {
      throw new ValidationError(
        `Invalid IANA timezone identifier: '${timezone}'. Examples of valid identifiers include 'America/New_York', 'Asia/Kolkata', 'Europe/London'. Legacy abbreviations such as 'IST', 'EST', or 'PST' are not permitted.`,
      );
    }

    try {
      Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    } catch {
      throw new ValidationError(
        `Invalid IANA timezone identifier: '${timezone}'. Examples of valid identifiers include 'America/New_York', 'Asia/Kolkata', 'Europe/London'.`,
      );
    }
  }

  /**
   * Validates that startTime and endTime are in HH:mm format, that start is strictly before end,
   * and enforces the platform policy regarding cross-midnight windows.
   */
  public validateTimeRange(startTime: string, endTime: string): void {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(startTime)) {
      throw new ValidationError(
        `Invalid startTime format '${startTime}'. Must be 24-hour clock time in HH:mm format (e.g. 09:00)`,
      );
    }
    if (!timeRegex.test(endTime)) {
      throw new ValidationError(
        `Invalid endTime format '${endTime}'. Must be 24-hour clock time in HH:mm format (e.g. 17:00)`,
      );
    }

    const startMinutes = this.timeStringToMinutes(startTime);
    const endMinutes = this.timeStringToMinutes(endTime);

    if (startMinutes === endMinutes) {
      throw new ValidationError(`Start time and end time cannot be identical: '${startTime}'`);
    }

    if (startMinutes > endMinutes) {
      throw new ValidationError(
        `Cross-midnight availability windows (from ${startTime} to ${endTime}) are not permitted in a single rule. Please schedule as two separate windows: one ending at 23:59 on the start day, and one beginning at 00:00 on the subsequent day.`,
      );
    }
  }

  /**
   * Validates optional date boundaries if supplied.
   */
  public validateEffectiveDateRange(
    effectiveFrom?: Date | null | undefined,
    effectiveUntil?: Date | null | undefined,
  ): void {
    if (effectiveFrom && effectiveUntil) {
      if (effectiveFrom.getTime() > effectiveUntil.getTime()) {
        throw new ValidationError('effectiveFrom must be on or before effectiveUntil');
      }
    }
  }

  /**
   * Validates that a new or updated window does not overlap with existing active windows
   * for the same doctor on the same weekday.
   */
  public checkOverlappingWindows(
    existingWindows: DoctorAvailabilityEntity[],
    target: {
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
      excludeId?: string | undefined;
    },
  ): void {
    const targetStart = this.timeStringToMinutes(target.startTime);
    const targetEnd = this.timeStringToMinutes(target.endTime);

    for (const win of existingWindows) {
      if (!win.isActive) {
        continue;
      }
      if (target.excludeId && win.id === target.excludeId) {
        continue;
      }
      if (win.dayOfWeek !== target.dayOfWeek) {
        continue;
      }

      const existingStart = this.timeStringToMinutes(win.startTime);
      const existingEnd = this.timeStringToMinutes(win.endTime);

      // Overlap condition: startA < endB && endA > startB
      if (targetStart < existingEnd && targetEnd > existingStart) {
        throw new ConflictError(
          `Overlapping availability window detected on ${target.dayOfWeek}: ` +
            `requested [${target.startTime} - ${target.endTime}] overlaps with existing [${win.startTime} - ${win.endTime}]`,
        );
      }
    }
  }

  /**
   * Converts a 'HH:mm' string to total minutes since 00:00.
   */
  public timeStringToMinutes(timeStr: string): number {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0]!, 10);
    const minutes = parseInt(parts[1]!, 10);
    return hours * 60 + minutes;
  }
}
