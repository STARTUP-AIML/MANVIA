/**
 * Timezone and Date/Time Utilities for MANVIA
 * Ensures deterministic, accessible, localized presentation without arbitrary offsets.
 */

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatDateTime(isoString: string, timeZone?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const tz = timeZone || getUserTimezone();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(date);
}

export function formatDate(isoString: string, timeZone?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const tz = timeZone || getUserTimezone();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  }).format(date);
}

export function formatTime(isoString: string, timeZone?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;

  const tz = timeZone || getUserTimezone();
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(date);
}

export function formatDurationMinutes(minutes?: number | null): string {
  if (minutes === undefined || minutes === null) return 'Not recorded';
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
