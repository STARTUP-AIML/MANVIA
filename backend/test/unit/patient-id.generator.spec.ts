// ==============================================================================
// MANVIA — Patient ID Generator Unit Tests
// ==============================================================================
// Phase 6: Public Patient Identifier Format & Entropy Validation
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { generatePublicPatientId } from '../../src/modules/patient/utils/patient-id.generator.js';

describe('generatePublicPatientId', () => {
  it('should generate an ID matching PAT-XXXXXXXX format (8 uppercase hex chars)', () => {
    const id = generatePublicPatientId();
    expect(id).toMatch(/^PAT-[0-9A-F]{8}$/);
  });

  it('should generate unique values across consecutive calls', () => {
    const count = 100;
    const ids = new Set<string>();

    for (let i = 0; i < count; i++) {
      ids.add(generatePublicPatientId());
    }

    expect(ids.size).toBe(count);
  });
});
