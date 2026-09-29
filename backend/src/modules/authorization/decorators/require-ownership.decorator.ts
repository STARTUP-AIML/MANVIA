// ==============================================================================
// MANVIA — Resource Ownership Decorator
// ==============================================================================
// Phase 5: Route Metadata for Resource Ownership Authorization
// ==============================================================================

import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const REQUIRE_OWNERSHIP_KEY = 'manvia:require_ownership';

export interface OwnershipOptions {
  /**
   * Name of parameter containing the resource/owner ID.
   * Defaults to checking 'userId', then 'id'.
   */
  paramName?: string | undefined;

  /**
   * Source of the owner ID on the incoming request.
   * Defaults to 'params'.
   */
  location?: 'params' | 'body' | 'query' | undefined;

  /**
   * Whether the ADMIN role is permitted to access the resource even if not the owner.
   * Defaults to false (explicit opt-in required to avoid accidental admin bypass).
   */
  allowAdmin?: boolean | undefined;
}

/**
 * Enforces that the requesting user owns the targeted resource.
 * Enforced by ResourceOwnerGuard.
 */
export const RequireOwnership = (options?: OwnershipOptions): CustomDecorator<string> =>
  SetMetadata(REQUIRE_OWNERSHIP_KEY, options ?? {});
