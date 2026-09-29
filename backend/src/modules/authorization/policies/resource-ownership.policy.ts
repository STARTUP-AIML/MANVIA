// ==============================================================================
// MANVIA — Resource Ownership Policy
// ==============================================================================
// Phase 5: Reusable Resource Ownership Policy Handler
// ==============================================================================

import type { IPolicyHandler, AuthorizationContext } from '../authorization.interface.js';

export class ResourceOwnershipPolicy implements IPolicyHandler {
  public readonly name = 'ResourceOwnershipPolicy';

  /**
   * Evaluates if the authenticated user is the verified owner of the resource.
   */
  public handle(context: AuthorizationContext): boolean {
    if (!context.resourceOwnerId) {
      return false;
    }
    return context.user.id === context.resourceOwnerId;
  }
}
