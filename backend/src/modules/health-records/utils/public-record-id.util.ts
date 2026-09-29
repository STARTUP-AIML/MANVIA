import { randomBytes } from 'node:crypto';

/**
 * Generates an 8-character uppercase alphanumeric ID formatted as REC-XXXXXXXX
 * (collision-resistant, non-sequential, safe for client-facing exposure).
 */
export function generatePublicHealthRecordId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 crockford avoiding 0/O, 1/I
  const bytes = randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      id += chars[byte % chars.length];
    }
  }
  return `REC-${id}`;
}

/**
 * Generates an 8-character uppercase alphanumeric ID formatted as EVT-XXXXXXXX
 */
export function generatePublicTimelineEventId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      id += chars[byte % chars.length];
    }
  }
  return `EVT-${id}`;
}
