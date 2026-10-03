import { randomBytes } from 'node:crypto';

/**
 * Generates an 8-character uppercase alphanumeric ID formatted as APT-XXXXXXXX
 * (collision-resistant, non-sequential, safe for client-facing exposure).
 */
export function generatePublicAppointmentId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Crockford base32 avoiding easily confused characters
  const bytes = randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      id += chars[byte % chars.length];
    }
  }
  return `APT-${id}`;
}

/**
 * Generates an 8-character uppercase alphanumeric ID formatted as PRE-XXXXXXXX
 */
export function generatePublicPreConsultationId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      id += chars[byte % chars.length];
    }
  }
  return `PRE-${id}`;
}
