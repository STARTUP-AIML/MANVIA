// ==============================================================================
// MANVIA — PermissionService Unit Tests
// ==============================================================================
// Phase 5: RBAC Role & Permission Mapping Validation
// ==============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionService } from '../../src/modules/authorization/services/permission.service.js';
import { Permission } from '../../src/modules/authorization/authorization.interface.js';
import { Role } from '@prisma/client';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
  });

  describe('getPermissionsForRole', () => {
    it('should return patient permissions for PATIENT role', () => {
      const perms = service.getPermissionsForRole(Role.PATIENT);
      expect(perms).toContain(Permission.USER_READ);
      expect(perms).toContain(Permission.PATIENT_PROFILE_READ);
      expect(perms).toContain(Permission.HEALTH_RECORD_READ);
      expect(perms).not.toContain(Permission.ADMIN_ACCESS);
      expect(perms).not.toContain(Permission.DOCTOR_PROFILE_READ);
    });

    it('should return doctor permissions for DOCTOR role without unconditional patient bypass', () => {
      const perms = service.getPermissionsForRole(Role.DOCTOR);
      expect(perms).toContain(Permission.USER_READ);
      expect(perms).toContain(Permission.DOCTOR_PROFILE_READ);
      expect(perms).toContain(Permission.DOCTOR_PATIENT_ACCESS);
      expect(perms).not.toContain(Permission.ADMIN_ACCESS);
      expect(perms).not.toContain(Permission.USER_STATUS_MANAGE);
    });

    it('should return admin permissions for ADMIN role without clinical patient bypass', () => {
      const perms = service.getPermissionsForRole(Role.ADMIN);
      expect(perms).toContain(Permission.ADMIN_ACCESS);
      expect(perms).toContain(Permission.AUDIT_LOG_READ);
      expect(perms).toContain(Permission.USER_STATUS_MANAGE);
      expect(perms).not.toContain(Permission.HEALTH_RECORD_READ);
      expect(perms).not.toContain(Permission.DOCTOR_PROFILE_READ);
    });

    it('should return empty array for unknown or unmapped role', () => {
      const perms = service.getPermissionsForRole('UNKNOWN_ROLE' as Role);
      expect(perms).toEqual([]);
    });
  });

  describe('getPermissionsForRoles (union)', () => {
    it('should combine unique permissions from multiple roles', () => {
      const perms = service.getPermissionsForRoles([Role.PATIENT, Role.DOCTOR]);
      expect(perms).toContain(Permission.PATIENT_PROFILE_READ);
      expect(perms).toContain(Permission.DOCTOR_PROFILE_READ);
      expect(perms.filter((p) => p === Permission.USER_READ).length).toBe(1); // deduplicated
    });
  });

  describe('hasPermission', () => {
    it('should return true when role possesses permission', () => {
      expect(service.hasPermission(Role.PATIENT, Permission.USER_READ)).toBe(true);
      expect(service.hasPermission(Role.DOCTOR, Permission.DOCTOR_PROFILE_READ)).toBe(true);
      expect(service.hasPermission(Role.ADMIN, Permission.ADMIN_ACCESS)).toBe(true);
    });

    it('should return false when role does not possess permission', () => {
      expect(service.hasPermission(Role.PATIENT, Permission.ADMIN_ACCESS)).toBe(false);
      expect(service.hasPermission(Role.DOCTOR, Permission.ADMIN_ACCESS)).toBe(false);
      expect(service.hasPermission(Role.ADMIN, Permission.HEALTH_RECORD_READ)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true if empty permissions array is required', () => {
      expect(service.hasAllPermissions(Role.PATIENT, [])).toBe(true);
    });

    it('should return true if role possesses all specified permissions', () => {
      expect(
        service.hasAllPermissions(Role.PATIENT, [
          Permission.USER_READ,
          Permission.HEALTH_RECORD_READ,
        ]),
      ).toBe(true);
    });

    it('should return false if role is missing at least one permission', () => {
      expect(
        service.hasAllPermissions(Role.PATIENT, [
          Permission.USER_READ,
          Permission.DOCTOR_PROFILE_READ,
        ]),
      ).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if empty permissions array is tested', () => {
      expect(service.hasAnyPermission(Role.PATIENT, [])).toBe(true);
    });

    it('should return true if role possesses at least one permission', () => {
      expect(
        service.hasAnyPermission(Role.PATIENT, [
          Permission.ADMIN_ACCESS,
          Permission.HEALTH_RECORD_READ,
        ]),
      ).toBe(true);
    });

    it('should return false if role possesses none of the permissions', () => {
      expect(
        service.hasAnyPermission(Role.PATIENT, [
          Permission.ADMIN_ACCESS,
          Permission.DOCTOR_PROFILE_READ,
        ]),
      ).toBe(false);
    });
  });
});
