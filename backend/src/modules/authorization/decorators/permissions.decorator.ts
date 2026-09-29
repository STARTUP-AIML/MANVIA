// ==============================================================================
// MANVIA — Permissions Decorator
// ==============================================================================
// Phase 5: Route Metadata for Fine-Grained Permission Enforcement
// ==============================================================================

import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { Permission } from '../authorization.interface.js';

export const PERMISSIONS_KEY = 'manvia:permissions';

/**
 * Declares the specific permissions required to access an endpoint.
 * Enforced by RolesGuard.
 */
export const Permissions = (...permissions: Permission[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);
