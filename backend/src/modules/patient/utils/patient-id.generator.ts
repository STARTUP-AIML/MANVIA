// ==============================================================================
// MANVIA — Patient Public Identifier Generator
// ==============================================================================
// Phase 6: Public Patient Identifier (PAT-XXXXXXXX) Strategy
// ==============================================================================

import crypto from 'node:crypto';

/**
 * Generates an opaque, cryptographically random public patient identifier.
 * Format: PAT-XXXXXXXX (8 uppercase hexadecimal characters)
 * Ensures non-sequential, safe external exposure without leaking internal primary keys.
 */
export function generatePublicPatientId(): string {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PAT-${randomPart}`;
}
