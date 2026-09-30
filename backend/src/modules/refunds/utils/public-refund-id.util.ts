import { randomBytes } from 'node:crypto';

/**
 * Generates an 8-character uppercase alphanumeric ID formatted as REF-XXXXXXXX
 * (collision-resistant, non-sequential, safe for client-facing exposure).
 */
export function generatePublicRefundId(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      id += chars[byte % chars.length];
    }
  }
  return `REF-${id}`;
}
