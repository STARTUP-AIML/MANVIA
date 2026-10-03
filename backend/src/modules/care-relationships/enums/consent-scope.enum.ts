/**
 * Granular resource scopes for patient-granted consent.
 * Governs which categories of patient health data a doctor may access.
 */
export enum ConsentScope {
  PATIENT_PROFILE = 'PATIENT_PROFILE',
  CONSULTATION_INFO = 'CONSULTATION_INFO',
  PRE_CONSULTATION = 'PRE_CONSULTATION',
  HEALTH_RECORDS = 'HEALTH_RECORDS',
  HEALTH_TIMELINE = 'HEALTH_TIMELINE',
  WELLNESS = 'WELLNESS',
}
