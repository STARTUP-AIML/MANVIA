import crypto from 'node:crypto';

const PUBLIC_PATIENT_ID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PUBLIC_PATIENT_ID_LENGTH = 8;
const PUBLIC_PATIENT_ID_PREFIX = 'PAT-';

/**
 * Generates a standardized, collision-resistant public patient identifier (e.g. PAT-90218471).
 * Safe to expose publicly in URLs, APIs, and client-facing interfaces.
 */
export function generatePublicPatientId(): string {
  const bytes = crypto.randomBytes(PUBLIC_PATIENT_ID_LENGTH);
  let id = '';
  for (let i = 0; i < PUBLIC_PATIENT_ID_LENGTH; i++) {
    const byte = bytes[i] ?? 0;
    const char = PUBLIC_PATIENT_ID_CHARS[byte % PUBLIC_PATIENT_ID_CHARS.length] ?? '0';
    id += char;
  }
  return `${PUBLIC_PATIENT_ID_PREFIX}${id}`;
}

/**
 * Validates whether a given string adheres to the canonical MANVIA public patient identifier format.
 */
export function isValidPublicPatientId(id: string): boolean {
  return /^PAT-[A-Z0-9]{8}$/.test(id);
}
