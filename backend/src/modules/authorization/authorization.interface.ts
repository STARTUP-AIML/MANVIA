// ==============================================================================
// MANVIA — Authorization Module Interfaces & Contracts
// ==============================================================================
// Phase 5: Authorization & Security Foundation Contracts
// ==============================================================================

import type { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/auth.interface.js';

export { Role };

/**
 * Granular platform permissions for Role-Based Access Control (RBAC).
 */
export enum Permission {
  // Identity & User Profile
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',

  // Patient Domain (Foundational)
  PATIENT_PROFILE_READ = 'patient_profile:read',
  PATIENT_PROFILE_UPDATE = 'patient_profile:update',
  HEALTH_RECORD_READ = 'health_record:read',
  HEALTH_RECORD_CREATE = 'health_record:create',

  // Doctor Domain (Foundational)
  DOCTOR_PROFILE_READ = 'doctor_profile:read',
  DOCTOR_PROFILE_UPDATE = 'doctor_profile:update',
  DOCTOR_PATIENT_ACCESS = 'doctor:patient_access',

  // Administrative Operations
  ADMIN_ACCESS = 'admin:access',
  AUDIT_LOG_READ = 'audit_log:read',
  USER_STATUS_MANAGE = 'user_status:manage',
}

/**
 * Common action verbs for authorization policies.
 */
export type Action = 'read' | 'create' | 'update' | 'delete' | 'manage';

/**
 * Minimal context required to make an authorization decision.
 * Prevents loading entire domain records into authorization evaluations.
 */
export interface AuthorizationContext {
  user: AuthenticatedUser;
  action?: Action | string | undefined;
  resourceType?: string | undefined;
  resourceId?: string | undefined;
  resourceOwnerId?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Outcome of an authorization evaluation.
 */
export interface AuthorizationResult {
  isAuthorized: boolean;
  reason?: string | undefined;
}

/**
 * Interface representing a domain entity with an immutable owner ID.
 */
export interface IOwnable {
  id: string;
  ownerId: string;
}

/**
 * Interface for extensible resource-level authorization policy handlers.
 */
export interface IPolicyHandler {
  readonly name: string;
  handle(context: AuthorizationContext): Promise<boolean> | boolean;
}
