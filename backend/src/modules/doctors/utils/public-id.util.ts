import crypto from 'node:crypto';

const PUBLIC_DOCTOR_ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PUBLIC_DOCTOR_ID_LENGTH = 8;
const PUBLIC_DOCTOR_ID_PREFIX = 'DOC-';

/**
 * Generates a standardized, collision-resistant public doctor identifier (e.g. DOC-90218471).
 * Safe to expose publicly in URLs, APIs, and client-facing interfaces.
 */
export function generatePublicDoctorId(): string {
  const bytes = crypto.randomBytes(PUBLIC_DOCTOR_ID_LENGTH);
  let id = '';
  for (let i = 0; i < PUBLIC_DOCTOR_ID_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    const char = PUBLIC_DOCTOR_ID_CHARS[byte % PUBLIC_DOCTOR_ID_CHARS.length] ?? '0';
    id += char;
  }
  return `${PUBLIC_DOCTOR_ID_PREFIX}${id}`;
}

/**
 * Validates whether a given string adheres to the canonical MANVIA public doctor identifier format.
 */
export function isValidPublicDoctorId(id: string): boolean {
  return /^DOC-[A-Z0-9]{8}$/.test(id);
}
