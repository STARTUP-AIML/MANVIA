import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/in-memory-care-relationship.repository.js';
import { PrismaCareRelationshipRepository } from '../../src/modules/care-relationships/repositories/prisma-care-relationship.repository.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { ConsentAction } from '../../src/modules/care-relationships/enums/consent-action.enum.js';

describe('Care Relationships & Consent Integration Tests', () => {
  let careRelRepo: InMemoryCareRelationshipRepository;

  const PATIENT_USER = 'usr-pat-integ-1';
  const DOCTOR_ID = 'doc-integ-uuid-1';

  beforeEach(async () => {
    careRelRepo = new InMemoryCareRelationshipRepository();
  });

  describe('Patient Profile & Care Relationship Persistence', () => {
    it('should create and retrieve patient profile by user ID and public ID', async () => {
      const created = await careRelRepo.createPatientProfile(PATIENT_USER, {
        publicPatientId: 'PAT-INTEG01',
        legalFirstName: 'Beverly',
        legalLastName: 'Crusher',
        displayName: 'Dr. Beverly Crusher',
      });

      expect(created.id).toBeDefined();
      expect(created.publicPatientId).toBe('PAT-INTEG01');

      const byUser = await careRelRepo.findPatientByUserId(PATIENT_USER);
      expect(byUser?.id).toBe(created.id);

      const byPublicId = await careRelRepo.findPatientByPublicId('PAT-INTEG01');
      expect(byPublicId?.id).toBe(created.id);
    });

    it('should persist care relationships and support querying by status', async () => {
      const patient = await careRelRepo.createPatientProfile(PATIENT_USER, {
        publicPatientId: 'PAT-INTEG02',
        legalFirstName: 'Jean-Luc',
        legalLastName: 'Picard',
      });

      const rel = await careRelRepo.createCareRelationship({
        patientId: patient.id,
        doctorId: DOCTOR_ID,
        status: CareRelationshipStatus.ACTIVE,
        notes: 'Cardiology management',
      });

      expect(rel.id).toBeDefined();
      expect(rel.status).toBe(CareRelationshipStatus.ACTIVE);

      // Query active relationships
      const activeList = await careRelRepo.findCareRelationshipsByPatientId(patient.id, true);
      expect(activeList).toHaveLength(1);
      expect(activeList[0]?.id).toBe(rel.id);

      // Update to TERMINATED
      const updated = await careRelRepo.updateCareRelationship(rel.id, {
        status: CareRelationshipStatus.TERMINATED,
        terminatedAt: new Date(),
      });
      expect(updated.status).toBe(CareRelationshipStatus.TERMINATED);

      const activeAfterTerminate = await careRelRepo.findCareRelationshipsByPatientId(
        patient.id,
        true,
      );
      expect(activeAfterTerminate).toHaveLength(0);
    });
  });

  describe('Consent Persistence & Immutable History Trail', () => {
    it('should persist consent and track auditable lifecycle actions', async () => {
      const patient = await careRelRepo.createPatientProfile(PATIENT_USER, {
        publicPatientId: 'PAT-INTEG03',
        legalFirstName: 'William',
        legalLastName: 'Riker',
      });

      // Create consent
      const consent = await careRelRepo.createConsent({
        patientId: patient.id,
        doctorId: DOCTOR_ID,
        scope: ConsentScope.HEALTH_RECORDS,
        purpose: 'Annual health review',
      });

      expect(consent.id).toBeDefined();
      expect(consent.status).toBe(ConsentStatus.ACTIVE);

      // Add GRANTED history event
      await careRelRepo.addConsentHistory({
        consentId: consent.id,
        action: ConsentAction.GRANTED,
        actorId: PATIENT_USER,
        actorRole: 'PATIENT',
        reason: 'Explicit patient approval',
      });

      // Update consent to REVOKED
      await careRelRepo.updateConsent(consent.id, {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: PATIENT_USER,
        revocationReason: 'No longer required',
      });

      // Add REVOKED history event
      await careRelRepo.addConsentHistory({
        consentId: consent.id,
        action: ConsentAction.REVOKED,
        actorId: PATIENT_USER,
        actorRole: 'PATIENT',
        reason: 'Revoked by patient',
      });

      // Verify audit history sequence
      const history = await careRelRepo.getConsentHistory(consent.id);
      expect(history).toHaveLength(2);
      expect(history[0]?.action).toBe(ConsentAction.GRANTED);
      expect(history[1]?.action).toBe(ConsentAction.REVOKED);
    });
  });

  describe('PrismaCareRelationshipRepository Contract Verification', () => {
    it('should throw Error when PrismaClient is not initialized', async () => {
      const repo = new PrismaCareRelationshipRepository();
      await expect(repo.findPatientById('any-id')).rejects.toThrow(
        'PrismaClient is not initialized',
      );
    });

    it('should execute properly when mock Prisma client delegate is supplied', async () => {
      const mockPrisma = {
        patientProfile: {
          findUnique: async () => ({
            id: 'pat-mock-1',
            userId: PATIENT_USER,
            publicPatientId: 'PAT-MOCK01',
            legalFirstName: 'Deanna',
            legalLastName: 'Troi',
            displayName: 'Counselor Troi',
            dateOfBirth: null,
            gender: 'FEMALE',
            emergencyContactName: null,
            emergencyContactPhone: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        careRelationship: {
          findUnique: async () => ({
            id: 'rel-mock-1',
            patientId: 'pat-mock-1',
            doctorId: DOCTOR_ID,
            status: 'ACTIVE',
            establishedAt: new Date(),
            terminatedAt: null,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        consent: {
          findUnique: async () => ({
            id: 'con-mock-1',
            patientId: 'pat-mock-1',
            doctorId: DOCTOR_ID,
            careRelationshipId: 'rel-mock-1',
            scope: 'HEALTH_RECORDS',
            status: 'ACTIVE',
            purpose: null,
            grantedAt: new Date(),
            expiresAt: null,
            revokedAt: null,
            revokedBy: null,
            revocationReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        },
        consentHistory: {
          findMany: async () => [],
        },
      };

      const repo = new PrismaCareRelationshipRepository(mockPrisma as never);
      const patient = await repo.findPatientById('pat-mock-1');
      expect(patient).toBeDefined();
      expect(patient?.legalFirstName).toBe('Deanna');

      const rel = await repo.findCareRelationshipById('rel-mock-1');
      expect(rel).toBeDefined();
      expect(rel?.status).toBe(CareRelationshipStatus.ACTIVE);

      const consent = await repo.findConsentById('con-mock-1');
      expect(consent).toBeDefined();
      expect(consent?.scope).toBe(ConsentScope.HEALTH_RECORDS);
    });
  });
});
