import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';

describe('Care Relationships & Consent HTTP API (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;

  const DOCTOR_VERIFIED_USER = 'usr-e2e-doc-ver';
  const DOCTOR_UNVERIFIED_USER = 'usr-e2e-doc-unver';
  const PATIENT_A_USER = 'usr-e2e-pat-a';
  const PATIENT_B_USER = 'usr-e2e-pat-b';

  let verifiedDoctorPublicId: string;
  let unverifiedDoctorPublicId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    doctorsRepo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    const specialties = await doctorsRepo.findActiveSpecialties();
    const languages = await doctorsRepo.findAllLanguages();

    // 1. Create Verified Doctor
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        'x-user-id': DOCTOR_VERIFIED_USER,
        'x-user-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. Gregory House, MD',
        medicalRegistrationNumber: 'MED-E2E-HOUSE-10',
        licensingCouncil: 'New Jersey Board of Medical Examiners',
        yearsOfExperience: 20,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
    const parsedA = JSON.parse(resA.payload);
    verifiedDoctorPublicId = parsedA.publicDoctorId;

    // Upgrade to VERIFIED status
    const docProfile = await doctorsRepo.findByUserId(DOCTOR_VERIFIED_USER);
    await doctorsRepo.updateVerificationStatus(
      docProfile!.id,
      VerificationStatus.VERIFIED,
      new Date(),
    );

    // 2. Create Unverified Doctor
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        'x-user-id': DOCTOR_UNVERIFIED_USER,
        'x-user-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. John Watson, MD',
        medicalRegistrationNumber: 'MED-E2E-WATSON-11',
        licensingCouncil: 'UK General Medical Council',
        yearsOfExperience: 10,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
    const parsedB = JSON.parse(resB.payload);
    unverifiedDoctorPublicId = parsedB.publicDoctorId;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ==========================================================================
  // 1. Patient Care Relationships
  // ==========================================================================
  describe('Patient Care Relationship Management (/api/v1/care-relationships)', () => {
    let createdRelId: string;

    it('POST should establish active care relationship with verified doctor (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/care-relationships',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          doctorId: verifiedDoctorPublicId,
          notes: 'Primary diagnostic relationship established',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
      expect(body.publicDoctorId).toBe(verifiedDoctorPublicId);
      expect(body.status).toBe(CareRelationshipStatus.ACTIVE);
      expect(body.establishedAt).toBeDefined();

      createdRelId = body.id;
    });

    it('POST should reject establishing care relationship with unverified doctor (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/care-relationships',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          doctorId: unverifiedDoctorPublicId,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('VALIDATION_FAILED');
    });

    it('POST should reject duplicate active care relationship with same doctor (409)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/care-relationships',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          doctorId: verifiedDoctorPublicId,
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('CONFLICT');
    });

    it('GET should list patient care relationships (200)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/care-relationships',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0].publicDoctorId).toBe(verifiedDoctorPublicId);
    });

    it('DELETE should terminate care relationship (200)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/care-relationships/${createdRelId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe(CareRelationshipStatus.TERMINATED);
      expect(body.terminatedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // 2. Patient Consents
  // ==========================================================================
  describe('Patient Consent Lifecycle Management (/api/v1/consents)', () => {
    let createdConsentId: string;
    let patientAPublicId: string;

    it('POST should grant scoped consent and auto-establish care relationship (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          doctorId: verifiedDoctorPublicId,
          scopes: [ConsentScope.PATIENT_PROFILE, ConsentScope.HEALTH_RECORDS],
          purpose: 'Diagnostic review and treatment planning',
          expiresAt: '2026-12-31T23:59:59.000Z',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
      expect(body[0].scope).toBe(ConsentScope.PATIENT_PROFILE);
      expect(body[0].status).toBe(ConsentStatus.ACTIVE);
      expect(body[0].isCurrentlyActive).toBe(true);
      expect(body[0].expiresAt).toBeDefined();

      createdConsentId = body[1].id; // HEALTH_RECORDS consent
      patientAPublicId = body[0].publicPatientId;
    });

    it('POST should reject consent grant for unverified doctor (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/consents',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          doctorId: unverifiedDoctorPublicId,
          scopes: [ConsentScope.WELLNESS],
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('VALIDATION_FAILED');
    });

    it('GET should list granted consents for authenticated patient (200)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/consents',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });

    it('GET :id should return consent details and immutable audit history (200)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/consents/${createdConsentId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.consent).toBeDefined();
      expect(body.consent.id).toBe(createdConsentId);
      expect(Array.isArray(body.history)).toBe(true);
      expect(body.history.length).toBeGreaterThanOrEqual(1);
      expect(body.history[0].action).toBe('GRANTED');
    });

    it('POST :id/revoke should revoke active consent and append revocation history (200)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/consents/${createdConsentId}/revoke`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          reason: 'Patient terminated consultation agreement',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe(ConsentStatus.REVOKED);
      expect(body.isCurrentlyActive).toBe(false);
      expect(body.revocationReason).toBe('Patient terminated consultation agreement');

      // Verify audit history updated
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/v1/consents/${createdConsentId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });
      const detailBody = JSON.parse(detailRes.payload);
      expect(detailBody.history).toHaveLength(2);
      expect(detailBody.history[1].action).toBe('REVOKED');
      expect(detailBody.history[1].reason).toBe('Patient terminated consultation agreement');
    });

    // ========================================================================
    // 3. Doctor Care Relationships & Resource Access Verification
    // ========================================================================
    describe('Doctor Care Relationships & Access Verification', () => {
      it('GET /api/v1/doctors/me/care-relationships should list relationships for doctor (200)', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/doctors/me/care-relationships',
          headers: {
            'x-user-id': DOCTOR_VERIFIED_USER,
            'x-user-role': 'DOCTOR',
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThanOrEqual(1);
      });

      it('GET /api/v1/doctors/me/care-relationships/access should ALLOW access for active consent scope', async () => {
        // Patient grants CONSULTATION_INFO consent
        await app.inject({
          method: 'POST',
          url: '/api/v1/consents',
          headers: {
            'x-user-id': PATIENT_A_USER,
            'x-user-role': 'PATIENT',
          },
          payload: {
            doctorId: verifiedDoctorPublicId,
            scopes: [ConsentScope.CONSULTATION_INFO],
          },
        });

        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/doctors/me/care-relationships/access?patientId=${patientAPublicId}&resourceType=${ConsentScope.CONSULTATION_INFO}`,
          headers: {
            'x-user-id': DOCTOR_VERIFIED_USER,
            'x-user-role': 'DOCTOR',
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.allowed).toBe(true);
        expect(body.consentId).toBeDefined();
      });

      it('GET /api/v1/doctors/me/care-relationships/access should DENY access for revoked consent scope', async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/doctors/me/care-relationships/access?patientId=${patientAPublicId}&resourceType=${ConsentScope.HEALTH_RECORDS}`,
          headers: {
            'x-user-id': DOCTOR_VERIFIED_USER,
            'x-user-role': 'DOCTOR',
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.allowed).toBe(false);
        expect(body.reason).toContain('not granted active consent');
      });
    });

    // ========================================================================
    // 4. Security & Multi-Tenant Authorization Enforcement
    // ========================================================================
    describe('Multi-Tenant Security Boundaries', () => {
      it('SECURITY: Unauthenticated requests should receive 401', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/consents',
        });
        expect(res.statusCode).toBe(401);
      });

      it('SECURITY: Doctor role attempting to grant patient consent receives 403', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/consents',
          headers: {
            'x-user-id': DOCTOR_VERIFIED_USER,
            'x-user-role': 'DOCTOR',
          },
          payload: {
            doctorId: verifiedDoctorPublicId,
            scopes: [ConsentScope.PATIENT_PROFILE],
          },
        });

        expect(res.statusCode).toBe(403);
      });

      it('SECURITY: Patient B attempting to revoke Patient A consent receives 403', async () => {
        const res = await app.inject({
          method: 'POST',
          url: `/api/v1/consents/${createdConsentId}/revoke`,
          headers: {
            'x-user-id': PATIENT_B_USER,
            'x-user-role': 'PATIENT',
          },
          payload: {
            reason: 'Malicious revocation attempt',
          },
        });

        expect(res.statusCode).toBe(403);
      });

      it('SECURITY: Patient attempting to access doctor care-relationships endpoint receives 403', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/doctors/me/care-relationships',
          headers: {
            'x-user-id': PATIENT_A_USER,
            'x-user-role': 'PATIENT',
          },
        });

        expect(res.statusCode).toBe(403);
      });
    });
  });
});
