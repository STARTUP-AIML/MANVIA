// ==============================================================================
// MANVIA — Policy Evaluation Decorator
// ==============================================================================
// Phase 5: Route Metadata for Extensible Policy Evaluation
// ==============================================================================

import { SetMetadata, type CustomDecorator } from '@nestjs/common';
import type { IPolicyHandler } from '../authorization.interface.js';

export const CHECK_POLICIES_KEY = 'manvia:check_policies';

/**
 * Attaches extensible authorization policy handlers to an endpoint.
 * Enforced by PolicyGuard.
 */
export const CheckPolicies = (...handlers: IPolicyHandler[]): CustomDecorator<string> =>
  SetMetadata(CHECK_POLICIES_KEY, handlers);
