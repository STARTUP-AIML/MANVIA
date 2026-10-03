/**
 * MANVIA Timezone Utilities
 * Detects user timezone from environment and guarantees consistent timezone formatting.
 */

/**
 * Returns the user's localized IANA timezone identifier (e.g. 'America/New_York', 'Asia/Kolkata').
 */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Validates whether an IANA timezone identifier is valid.
 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}
