import { describe, it, expect, beforeEach } from 'vitest';
import { ConsentsService } from '../../src/modules/care-relationships/services/consents.service.js';
import { ResourceAuthorizationService } from '../../src/modules/care-relationships/services/resource-authorization.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('ConsentsService (Unit Tests)', () => {
  let service: ConsentsService;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let auditService: ConsentAuditService;
  let authService: ResourceAuthorizationService;

  const PATIENT_A_USER = 'usr-pat-a';
  const PATIENT_B_USER = 'usr-pat-b';
  const DOCTOR_VERIFIED_USER = 'usr-doc-verified';
  const DOCTOR_UNVERIFIED_USER = 'usr-doc-unverified';

  let verifiedDoctorPublicId: string;
  let unverifiedDoctorPublicId: string;

  beforeEach(async () => {
    careRelRepo = new InMemoryCareRelationshipRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    auditService = new ConsentAuditService();
    authService = new ResourceAuthorizationService(careRelRepo, doctorsRepo, auditService);

    service = new ConsentsService(careRelRepo, doctorsRepo, auditService, authService);

    // Create Verified Doctor
    const docVerified = await doctorsRepo.createProfile({
      userId: DOCTOR_VERIFIED_USER,
      publicDoctorId: 'DOC-CONS-01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-CONS-01',
      licensingCouncil: 'NJ Board',
      yearsOfExperience: 20,
    });
    await doctorsRepo.updateVerificationStatus(
      docVerified.id,
      VerificationStatus.VERIFIED,
      new Date(),
    );
    verifiedDoctorPublicId = docVerified.publicDoctorId;

    // Create Unverified Doctor
    const docUnverified = await doctorsRepo.createProfile({
      userId: DOCTOR_UNVERIFIED_USER,
      publicDoctorId: 'DOC-CONS-02',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-CONS-02',
      licensingCouncil: 'UK GMC',
      yearsOfExperience: 10,
    });
    unverifiedDoctorPublicId = docUnverified.publicDoctorId;
  });

  describe('Grant Consent', () => {
    it('should grant scoped consent and auto-establish care relationship if not present', async () => {
      const results = await service.grantConsent(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
        scopes: [ConsentScope.PATIENT_PROFILE, ConsentScope.HEALTH_RECORDS],
        purpose: 'Direct clinical intake and diagnostic review',
      });

      expect(results).toHaveLength(2);
      expect(results[0]?.scope).toBe(ConsentScope.PATIENT_PROFILE);
      expect(results[0]?.status).toBe(ConsentStatus.ACTIVE);
      expect(results[0]?.isCurrentlyActive).toBe(true);
      expect(results[0]?.purpose).toBe('Direct clinical intake and diagnostic review');
      expect(results[0]?.careRelationshipId).toBeDefined();

      expect(results[1]?.scope).toBe(ConsentScope.HEALTH_RECORDS);
      expect(results[1]?.status).toBe(ConsentStatus.ACTIVE);
    });

    it('VERIFIED DOCTOR RULE: should reject consent grant to unverified doctor', async () => {
      await expect(
        service.grantConsent(PATIENT_A_USER, {
          doctorId: unverifiedDoctorPublicId,
          scopes: [ConsentScope.HEALTH_RECORDS],
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid or past expiration timestamp', async () => {
      await expect(
        service.grantConsent(PATIENT_A_USER, {
          doctorId: verifiedDoctorPublicId,
          scopes: [ConsentScope.HEALTH_RECORDS],
          expiresAt: '2020-01-01T00:00:00.000Z', // past date
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should prevent duplicate active consent grant for the same scope', async () => {
      await service.grantConsent(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
        scopes: [ConsentScope.WELLNESS],
      });

      await expect(
        service.grantConsent(PATIENT_A_USER, {
          doctorId: verifiedDoctorPublicId,
          scopes: [ConsentScope.WELLNESS],
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Revoke Consent', () => {
    it('should revoke an active consent and record immutable audit history', async () => {
      const grants = await service.grantConsent(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
        scopes: [ConsentScope.HEALTH_TIMELINE],
      });

      const consentId = grants[0]!.id;

      const revoked = await service.revokeConsent(PATIENT_A_USER, consentId, {
        reason: 'Care cycle concluded',
      });

      expect(revoked.status).toBe(ConsentStatus.REVOKED);
      expect(revoked.revokedAt).toBeDefined();
      expect(revoked.isCurrentlyActive).toBe(false);

      // Verify audit history
      const details = await service.getConsentDetails(PATIENT_A_USER, consentId);
      expect(details.history.length).toBeGreaterThanOrEqual(2); // GRANTED + REVOKED
      const lastHistory = details.history[details.history.length - 1];
      expect(lastHistory?.action).toBe('REVOKED');
      expect(lastHistory?.reason).toBe('Care cycle concluded');
    });

    it('should reject revoking an already revoked consent', async () => {
      const grants = await service.grantConsent(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
        scopes: [ConsentScope.PRE_CONSULTATION],
      });

      const consentId = grants[0]!.id;
      await service.revokeConsent(PATIENT_A_USER, consentId, {});

      await expect(service.revokeConsent(PATIENT_A_USER, consentId, {})).rejects.toThrow(
        ValidationError,
      );
    });

    it('SECURITY: should prevent Patient B from revoking Patient A consent', async () => {
      const grants = await service.grantConsent(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
        scopes: [ConsentScope.CONSULTATION_INFO],
      });

      const consentId = grants[0]!.id;

      await expect(service.revokeConsent(PATIENT_B_USER, consentId, {})).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('Consent Expiration Evaluation', () => {
    it('should treat an expired consent as inactive even if status in DB is ACTIVE', async () => {
      const patient = await careRelRepo.createPatientProfile(PATIENT_A_USER, {
        publicPatientId: 'PAT-CONS-EXP',
        legalFirstName: 'Jane',
        legalLastName: 'Doe',
      });
      const doctor = await doctorsRepo.findByPublicId(verifiedDoctorPublicId);

      // Manually persist a consent with expiresAt in the past
      const expiredConsent = await careRelRepo.createConsent({
        patientId: patient.id,
        doctorId: doctor!.id,
        scope: ConsentScope.WELLNESS,
        expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
        status: ConsentStatus.ACTIVE,
      });

      const list = await service.getPatientConsents(PATIENT_A_USER);
      const found = list.find((c) => c.id === expiredConsent.id);
      expect(found).toBeDefined();
      expect(found?.isCurrentlyActive).toBe(false);
    });
  });
});
