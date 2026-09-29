import { SetMetadata } from '@nestjs/common';
import type { ConsentScope } from '../enums/consent-scope.enum.js';

export const REQUIRE_CONSENT_SCOPE_KEY = 'require_consent_scope';

/**
 * Decorator to enforce that patient has granted active, unexpired, unrevoked consent
 * for the specified resource scope to the requesting doctor.
 */
export const RequireConsent = (scope: ConsentScope) =>
  SetMetadata(REQUIRE_CONSENT_SCOPE_KEY, scope);
