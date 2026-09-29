import { describe, it, expect } from 'vitest';
import {
  generatePublicDoctorId,
  isValidPublicDoctorId,
} from '../../src/modules/doctors/utils/public-id.util.js';

describe('Public Doctor ID Utility', () => {
  it('should generate valid public doctor ID with DOC- prefix followed by 8 alphanumeric characters', () => {
    const id = generatePublicDoctorId();
    expect(id).toMatch(/^DOC-[A-Z0-9]{8}$/);
    expect(id.length).toBe(12);
  });

  it('should validate canonical public doctor IDs', () => {
    expect(isValidPublicDoctorId('DOC-90218471')).toBe(true);
    expect(isValidPublicDoctorId('DOC-ABC12345')).toBe(true);
    expect(isValidPublicDoctorId('DOC-ZZZZZZZZ')).toBe(true);
  });

  it('should reject malformed or non-canonical doctor IDs', () => {
    expect(isValidPublicDoctorId('PAT-90218471')).toBe(false);
    expect(isValidPublicDoctorId('doc-90218471')).toBe(false); // lowercase
    expect(isValidPublicDoctorId('DOC-123')).toBe(false); // too short
    expect(isValidPublicDoctorId('DOC-123456789')).toBe(false); // too long
    expect(isValidPublicDoctorId('DOC-1234@678')).toBe(false); // invalid symbol
    expect(isValidPublicDoctorId('')).toBe(false);
  });

  it('should generate distinct, collision-resistant IDs across successive calls', () => {
    const ids = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      const id = generatePublicDoctorId();
      expect(ids.has(id)).toBe(false);
      ids.add(id);
    }
    expect(ids.size).toBe(count);
  });
});
