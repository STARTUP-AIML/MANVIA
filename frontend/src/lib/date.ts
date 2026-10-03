/**
 * MANVIA Date & Time Formatting Utilities
 * Standardizes ISO 8601 formatting, user timezone projection, and localization.
 */

import { getUserTimeZone } from "./timezone";
export { getUserTimeZone, getUserTimeZone as getUserTimezone } from "./timezone";

export interface DateFormatOptions {
  timeZone?: string;
  locale?: string;
}

/**
 * Formats a UTC ISO timestamp or Date into a user-friendly date string.
 * Example: 'October 2, 2026'
 */
export function formatDate(
  input: string | number | Date,
  options: DateFormatOptions = {},
): string {
  const date = typeof input === "object" ? input : new Date(input);
  if (isNaN(date.getTime())) return "Invalid date";

  const timeZone = options.timeZone || getUserTimeZone();
  const locale = options.locale || "en-US";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone,
  }).format(date);
}

/**
 * Formats a UTC timestamp into a user-friendly time string.
 * Example: '2:30 PM'
 */
export function formatTime(
  input: string | number | Date,
  options: DateFormatOptions = {},
): string {
  const date = typeof input === "object" ? input : new Date(input);
  if (isNaN(date.getTime())) return "Invalid time";

  const timeZone = options.timeZone || getUserTimeZone();
  const locale = options.locale || "en-US";

  return new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
    timeZone,
  }).format(date);
}

/**
 * Formats a UTC timestamp into a full date and time string with timezone abbreviation.
 * Example: 'Oct 2, 2026, 2:30 PM IST'
 */
export function formatDateTime(
  input: string | number | Date,
  options: DateFormatOptions = {},
): string {
  const date = typeof input === "object" ? input : new Date(input);
  if (isNaN(date.getTime())) return "Invalid date/time";

  const timeZone = options.timeZone || getUserTimeZone();
  const locale = options.locale || "en-US";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatDurationMinutes(minutes?: number | null): string {
  if (minutes === undefined || minutes === null) return "Not recorded";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) {
    return `${hrs}h ${mins}m`;
  }
  if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${mins}m`;
}
