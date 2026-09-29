// ==============================================================================
// MANVIA — Password Service
// ==============================================================================
// Phase 4: Production Argon2id Cryptographic Password Hashing & Policy Enforcement
// ==============================================================================

import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

export interface PasswordPolicyResult {
  isValid: boolean;
  errors: string[];
}

@Injectable()
export class PasswordService {
  /**
   * Generates a cryptographic Argon2id password hash using recommended OWASP baseline:
   * - Type: Argon2id (hybrid resistant to both GPU and side-channel attacks)
   * - Memory cost: 64 MB (65536 KiB)
   * - Time cost (iterations): 3
   * - Parallelism: 1 thread
   */
  public async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  /**
   * Verifies an unhashed candidate password against an existing Argon2 hash.
   * Execution is timing-attack safe via the native Argon2 verification library.
   */
  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Validates whether a candidate password adheres to the MANVIA security password policy:
   * - Minimum 12 characters
   * - Maximum 128 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one numeric digit
   * - At least one special symbol
   */
  public validatePasswordPolicy(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (!password || password.length < 12) {
      errors.push('Password must be at least 12 characters in length');
    }

    if (password && password.length > 128) {
      errors.push('Password must not exceed 128 characters in length');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one numeric digit');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
