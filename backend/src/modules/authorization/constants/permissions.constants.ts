// ==============================================================================
// MANVIA — Role-Permissions Mapping
// ==============================================================================
// Phase 5: RBAC Role & Permission Mappings
// ==============================================================================

import type { Role } from '@prisma/client';
import { Permission } from '../authorization.interface.js';

/**
 * Foundational mapping of system roles to permitted capabilities.
 * NOTE: DOCTOR role does NOT grant unconditional access to patient records;
 * clinical data access strictly requires CareRelationship + Consent policies (Phase 10).
 * NOTE: ADMIN role does NOT have automatic silent bypass for sensitive patient records.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  PATIENT: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.PATIENT_PROFILE_READ,
    Permission.PATIENT_PROFILE_UPDATE,
    Permission.HEALTH_RECORD_READ,
    Permission.HEALTH_RECORD_CREATE,
  ],
  DOCTOR: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.DOCTOR_PROFILE_READ,
    Permission.DOCTOR_PROFILE_UPDATE,
    Permission.DOCTOR_PATIENT_ACCESS,
  ],
  ADMIN: [
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_STATUS_MANAGE,
    Permission.ADMIN_ACCESS,
    Permission.AUDIT_LOG_READ,
  ],
};
