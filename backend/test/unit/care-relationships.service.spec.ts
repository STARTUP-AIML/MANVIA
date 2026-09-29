import { describe, it, expect, beforeEach } from 'vitest';
import { CareRelationshipsService } from '../../src/modules/care-relationships/services/care-relationships.service.js';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { ConsentAuditService } from '../../src/modules/care-relationships/services/consent-audit.service.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('CareRelationshipsService (Unit Tests)', () => {
  let service: CareRelationshipsService;
  let careRelRepo: InMemoryCareRelationshipRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let auditService: ConsentAuditService;

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

    service = new CareRelationshipsService(careRelRepo, doctorsRepo, auditService);

    // Create Verified Doctor
    const docVerified = await doctorsRepo.createProfile({
      userId: DOCTOR_VERIFIED_USER,
      publicDoctorId: 'DOC-CARE-01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-CARE-01',
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
      publicDoctorId: 'DOC-CARE-02',
      displayName: 'Dr. John Watson',
      medicalRegistrationNumber: 'MED-CARE-02',
      licensingCouncil: 'UK GMC',
      yearsOfExperience: 10,
    });
    unverifiedDoctorPublicId = docUnverified.publicDoctorId;
  });

  describe('Establish Care Relationship', () => {
    it('should establish an active care relationship with a verified doctor', async () => {
      const rel = await service.createCareRelationship(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
        notes: 'Primary physician engagement for preventative cardiology',
      });

      expect(rel.id).toBeDefined();
      expect(rel.publicDoctorId).toBe(verifiedDoctorPublicId);
      expect(rel.doctorDisplayName).toBe('Dr. Gregory House');
      expect(rel.status).toBe(CareRelationshipStatus.ACTIVE);
      expect(rel.establishedAt).toBeDefined();
      expect(rel.notes).toBe('Primary physician engagement for preventative cardiology');
    });

    it('VERIFIED DOCTOR RULE: should reject care relationship establishment with unverified doctor', async () => {
      await expect(
        service.createCareRelationship(PATIENT_A_USER, {
          doctorId: unverifiedDoctorPublicId,
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should reject non-existent doctor ID with NotFoundError', async () => {
      await expect(
        service.createCareRelationship(PATIENT_A_USER, {
          doctorId: 'DOC-NONEXIST',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should prevent duplicate active care relationships with the same doctor', async () => {
      await service.createCareRelationship(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
      });

      await expect(
        service.createCareRelationship(PATIENT_A_USER, {
          doctorId: verifiedDoctorPublicId,
        }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Retrieve Care Relationships', () => {
    it('should list all care relationships for the authenticated patient', async () => {
      await service.createCareRelationship(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
      });

      const list = await service.getPatientCareRelationships(PATIENT_A_USER);
      expect(list).toHaveLength(1);
      expect(list[0]?.publicDoctorId).toBe(verifiedDoctorPublicId);
    });

    it('should list care relationships for the authenticated doctor', async () => {
      await service.createCareRelationship(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
      });

      const doctorList = await service.getDoctorCareRelationships(DOCTOR_VERIFIED_USER);
      expect(doctorList).toHaveLength(1);
      expect(doctorList[0]?.publicPatientId).toBeDefined();
    });
  });

  describe('Terminate Care Relationship', () => {
    it('should terminate an active relationship and cascade revocation to active consents', async () => {
      const rel = await service.createCareRelationship(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
      });

      const patient = await careRelRepo.findPatientByUserId(PATIENT_A_USER);
      const doctor = await doctorsRepo.findByPublicId(verifiedDoctorPublicId);

      // Create an active consent
      const consent = await careRelRepo.createConsent({
        patientId: patient!.id,
        doctorId: doctor!.id,
        careRelationshipId: rel.id,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      // Terminate relationship
      const terminated = await service.terminateCareRelationship(PATIENT_A_USER, rel.id);
      expect(terminated.status).toBe(CareRelationshipStatus.TERMINATED);
      expect(terminated.terminatedAt).toBeDefined();

      // Verify consent is automatically REVOKED
      const updatedConsent = await careRelRepo.findConsentById(consent.id);
      expect(updatedConsent?.status).toBe(ConsentStatus.REVOKED);
      expect(updatedConsent?.revokedAt).toBeDefined();
    });

    it('SECURITY: should prevent Patient B from terminating Patient A care relationship', async () => {
      const relA = await service.createCareRelationship(PATIENT_A_USER, {
        doctorId: verifiedDoctorPublicId,
      });

      await expect(service.terminateCareRelationship(PATIENT_B_USER, relA.id)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });
});
