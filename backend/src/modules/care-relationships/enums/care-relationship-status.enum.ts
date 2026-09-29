/**
 * Authoritative lifecycle states for a patient-doctor care relationship.
 */
export enum CareRelationshipStatus {
  REQUESTED = 'REQUESTED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
  REVOKED = 'REVOKED',
}
