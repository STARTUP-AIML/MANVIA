import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceAuthorizationService } from '../../src/modules/care-relationships/services/resource-authorization.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';

describe('ResourceAuthorizationService (Unit Tests)', () => {
  let authService: ResourceAuthorizationService;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let auditService: ConsentAuditService;

  const PATIENT_A_USER = 'usr-pat-a';
  const PATIENT_B_USER = 'usr-pat-b';
  const DOCTOR_A_USER = 'usr-doc-a';
  const DOCTOR_UNVERIFIED_USER = 'usr-doc-unverified';

  let patientAInternalId: string;
  let doctorAInternalId: string;

  beforeEach(async () => {
    careRelRepo = new InMemoryCareRelationshipRepository();
    doctorsRepo = new InMemoryDoctorsRepository();
    auditService = new ConsentAuditService();

    authService = new ResourceAuthorizationService(careRelRepo, doctorsRepo, auditService);

    // Create Patient A
    const patientA = await careRelRepo.createPatientProfile(PATIENT_A_USER, {
      publicPatientId: 'PAT-AUTH-01',
      legalFirstName: 'Jane',
      legalLastName: 'Doe',
    });
    patientAInternalId = patientA.id;

    // Create Doctor A (Verified)
    const docA = await doctorsRepo.createProfile({
      userId: DOCTOR_A_USER,
      publicDoctorId: 'DOC-AUTH-01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-AUTH-01',
      licensingCouncil: 'NJ Board',
      yearsOfExperience: 20,
    });
    await doctorsRepo.updateVerificationStatus(docA.id, VerificationStatus.VERIFIED, new Date());
    doctorAInternalId = docA.id;

    // Create Unverified Doctor
    await doctorsRepo.createProfile({
      userId: DOCTOR_UNVERIFIED_USER,
      publicDoctorId: 'DOC-AUTH-02',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-AUTH-02',
      licensingCouncil: 'UK GMC',
      yearsOfExperience: 10,
    });
  });

  describe('Patient Self-Access', () => {
    it('should grant immediate access when patient accesses their own clinical resources', async () => {
      const decision = await authService.canAccessPatientResource({
        actorUserId: PATIENT_A_USER,
        actorRole: 'PATIENT',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain('Patient intrinsic self-access');
    });

    it('should deny access when Patient B attempts to access Patient A resources', async () => {
      const decision = await authService.canAccessPatientResource({
        actorUserId: PATIENT_B_USER,
        actorRole: 'PATIENT',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Access denied');
    });
  });

  describe('Provider Access Evaluation', () => {
    it('should allow access when active CareRelationship AND active Consent for scope exist', async () => {
      const rel = await careRelRepo.createCareRelationship({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      const consent = await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: rel.id,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_A_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(true);
      expect(decision.careRelationshipId).toBe(rel.id);
      expect(decision.consentId).toBe(consent.id);
    });

    it('should deny access when NO care relationship exists between doctor and patient', async () => {
      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_A_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('no active care relationship exists');
    });

    it('should deny access when care relationship is TERMINATED', async () => {
      const rel = await careRelRepo.createCareRelationship({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        status: CareRelationshipStatus.TERMINATED,
      });

      await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: rel.id,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_A_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('no active care relationship exists');
    });

    it('should deny access when consent was REVOKED', async () => {
      const rel = await careRelRepo.createCareRelationship({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      const consent = await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: rel.id,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      // Revoke consent
      await careRelRepo.updateConsent(consent.id, {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: PATIENT_A_USER,
      });

      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_A_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('not granted active consent');
    });

    it('should deny access when consent has EXPIRED', async () => {
      const rel = await careRelRepo.createCareRelationship({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: rel.id,
        scope: ConsentScope.HEALTH_RECORDS,
        expiresAt: new Date(Date.now() - 10000), // 10 seconds ago
        status: ConsentStatus.ACTIVE,
      });

      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_A_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("consent for scope 'HEALTH_RECORDS' has expired");
    });

    it('should deny access when consent scope does NOT match requested resource scope', async () => {
      const rel = await careRelRepo.createCareRelationship({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      // Granted ONLY for PATIENT_PROFILE, but doctor requests HEALTH_RECORDS
      await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: rel.id,
        scope: ConsentScope.PATIENT_PROFILE,
        status: ConsentStatus.ACTIVE,
      });

      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_A_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain("not granted active consent for scope 'HEALTH_RECORDS'");
    });

    it('VERIFIED DOCTOR RULE: should deny access to an unverified doctor', async () => {
      const decision = await authService.canAccessPatientResource({
        actorUserId: DOCTOR_UNVERIFIED_USER,
        actorRole: 'DOCTOR',
        patientId: patientAInternalId,
        resourceType: ConsentScope.HEALTH_RECORDS,
      });

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain(
        'doctor is not currently an active verified healthcare provider',
      );
    });
  });
});
