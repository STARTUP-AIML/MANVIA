/**
 * Auditable events recorded in the immutable consent history.
 */
export enum ConsentAction {
  GRANTED = 'GRANTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  SCOPE_UPDATED = 'SCOPE_UPDATED',
}
