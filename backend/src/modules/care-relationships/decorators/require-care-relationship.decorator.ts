import { SetMetadata } from '@nestjs/common';

export const REQUIRE_CARE_RELATIONSHIP_KEY = 'require_care_relationship';

/**
 * Decorator to enforce an active CareRelationship exists between the requesting doctor
 * and the patient who owns the target resource.
 */
export const RequireCareRelationship = () => SetMetadata(REQUIRE_CARE_RELATIONSHIP_KEY, true);
