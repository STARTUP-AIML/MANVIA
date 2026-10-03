// ==============================================================================
// MANVIA — Roles Decorator
// ==============================================================================
// Phase 5: Route Metadata for Role-Based Access Control
// ==============================================================================

import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'manvia:roles';

/**
 * Declares the roles allowed to access an endpoint or controller.
 * Enforced by RolesGuard.
 */
export const Roles = (...roles: Role[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
