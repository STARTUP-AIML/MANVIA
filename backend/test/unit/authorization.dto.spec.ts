// ==============================================================================
// MANVIA — Authorization DTOs Unit Tests
// ==============================================================================
// Phase 5: Authorization DTO Validation
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { SwitchRoleDto } from '../../src/modules/authorization/dto/switch-role.dto.js';
import { Role } from '@prisma/client';

describe('Authorization DTOs Validation', () => {
  describe('SwitchRoleDto', () => {
    it('should validate successfully with valid role', async () => {
      const dto = plainToInstance(SwitchRoleDto, {
        role: Role.DOCTOR,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail validation when role is empty or missing', async () => {
      const dto = plainToInstance(SwitchRoleDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when role is invalid enum value', async () => {
      const dto = plainToInstance(SwitchRoleDto, {
        role: 'SUPERADMIN',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('role');
    });
  });
});
