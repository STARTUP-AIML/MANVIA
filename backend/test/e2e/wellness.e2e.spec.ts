import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { CARE_RELATIONSHIP_REPOSITORY } from '../../src/modules/care-relationships/interfaces/care-relationship-repository.interface.js';
import type { ICareRelationshipRepository } from '../../src/modules/care-relationships/interfaces/care-relationship-repository.interface.js';

describe('Wellness Engine HTTP API (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;
  let careRelRepo: ICareRelationshipRepository;

  const DOCTOR_VERIFIED_USER = 'usr-e2e-well-doc-ver';
  const DOCTOR_UNVERIFIED_USER = 'usr-e2e-well-doc-unver';
  const PATIENT_A_USER = 'usr-e2e-well-pat-a';
  const PATIENT_B_USER = 'usr-e2e-well-pat-b';

  let doctorAInternalId: string;
  let patientAInternalId: string;
  let patientAPublicId: string;
  let careRelAId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    doctorsRepo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    careRelRepo = app.get<ICareRelationshipRepository>(CARE_RELATIONSHIP_REPOSITORY);

    const specialties = await doctorsRepo.findActiveSpecialties();
    const languages = await doctorsRepo.findAllLanguages();

    // 1. Create Verified Doctor
    const resDocA = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        'x-user-id': DOCTOR_VERIFIED_USER,
        'x-user-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. Gregory House, MD',
        medicalRegistrationNumber: 'MED-E2E-WELL-01',
        licensingCouncil: 'NJ Medical Board',
        yearsOfExperience: 20,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
    expect(resDocA.statusCode).toBe(201);
    const docAProfile = await doctorsRepo.findByUserId(DOCTOR_VERIFIED_USER);
    await doctorsRepo.updateVerificationStatus(
      docAProfile!.id,
      VerificationStatus.VERIFIED,
      new Date(),
    );
    doctorAInternalId = docAProfile!.id;

    // 2. Create Unverified Doctor
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        'x-user-id': DOCTOR_UNVERIFIED_USER,
        'x-user-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. John Watson, MD',
        medicalRegistrationNumber: 'MED-E2E-WELL-02',
        licensingCouncil: 'UK GMC',
        yearsOfExperience: 10,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });

    // 3. Establish Patient A Profile
    const patA = await careRelRepo.createPatientProfile(PATIENT_A_USER, {
      publicPatientId: 'PAT-WELL001',
      legalFirstName: 'Jane',
      legalLastName: 'Doe',
      displayName: 'Jane Doe',
    });
    patientAInternalId = patA.id;
    patientAPublicId = patA.publicPatientId;

    // 4. Establish Care Relationship between Patient A and Doctor A
    const careRel = await careRelRepo.createCareRelationship({
      patientId: patientAInternalId,
      doctorId: doctorAInternalId,
      status: CareRelationshipStatus.ACTIVE,
    });
    careRelAId = careRel.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Unauthenticated & Role Boundary Checks', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wellness/check-ins',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should reject non-patient caller from patient wellness endpoints with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wellness/check-ins',
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          mood: 4,
          stress: 2,
          energy: 4,
          sleepQuality: 4,
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Patient Self-Service Check-Ins Lifecycle', () => {
    let createdCheckInId: string;

    it('should reject invalid metric scores outside 1-5 with 400 Bad Request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wellness/check-ins',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          mood: 6, // invalid > 5
          stress: 0, // invalid < 1
          energy: 3,
          sleepQuality: 3,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('Request validation failed');
    });

    it('should successfully record a wellness check-in via POST /api/v1/wellness/check-ins', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wellness/check-ins',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          mood: 4,
          stress: 2,
          energy: 4,
          sleepQuality: 5,
          sleepDurationMinutes: 480,
          note: 'Woke up feeling energetic and ready for the day.',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
      expect(body.patientId).toBe(patientAInternalId);
      expect(body.mood).toBe(4);
      expect(body.stress).toBe(2);
      expect(body.energy).toBe(4);
      expect(body.sleepQuality).toBe(5);
      expect(body.sleepDurationMinutes).toBe(480);
      expect(body.note).toBe('Woke up feeling energetic and ready for the day.');

      createdCheckInId = body.id;
    });

    it('should support checkin recording via alias POST /api/v1/wellness/checkins', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/wellness/checkins',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          mood: 5,
          stress: 1,
          energy: 5,
          sleepQuality: 4,
          sleepDurationMinutes: 480,
          note: 'Alias route check-in reflection.',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.mood).toBe(5);
      expect(body.stress).toBe(1);
      expect(body.energy).toBe(5);
      expect(body.sleepDurationMinutes).toBe(480);
      expect(body.note).toBe('Alias route check-in reflection.');
    });

    it('should retrieve list of check-ins via GET /api/v1/wellness/check-ins', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wellness/check-ins',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.total).toBeGreaterThanOrEqual(2);
      expect(body.data[0].patientId).toBe(patientAInternalId);
    });

    it('should retrieve single check-in by ID via GET /api/v1/wellness/check-ins/:id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/wellness/check-ins/${createdCheckInId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.id).toBe(createdCheckInId);
      expect(body.mood).toBe(4);
    });

    it('PATIENT ISOLATION: Patient B cannot access Patient A check-in by ID (404)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/wellness/check-ins/${createdCheckInId}`,
        headers: {
          'x-user-id': PATIENT_B_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(404);
    });

    it('should update check-in via PATCH /api/v1/wellness/check-ins/:id', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/wellness/check-ins/${createdCheckInId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          mood: 5,
          note: 'Updated note after evening walk.',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.mood).toBe(5);
      expect(body.note).toBe('Updated note after evening walk.');
    });

    it('should retrieve summary via GET /api/v1/wellness/summary', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wellness/summary',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.totalCheckIns).toBeGreaterThanOrEqual(2);
      expect(body.streakDays).toBeGreaterThanOrEqual(1);
      expect(body.latestCheckIn).toBeDefined();
    });

    it('should retrieve trends via GET /api/v1/wellness/trends', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/wellness/trends?period=7d',
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.period).toBe('7d');
      expect(body.totalCheckIns).toBeGreaterThanOrEqual(2);
      expect(body.descriptiveInsights).toBeInstanceOf(Array);
    });

    it('should delete check-in via DELETE /api/v1/wellness/check-ins/:id', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/wellness/check-ins/${createdCheckInId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });

      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/api/v1/wellness/check-ins/${createdCheckInId}`,
        headers: {
          'x-user-id': PATIENT_A_USER,
          'x-user-role': 'PATIENT',
        },
      });
      expect(verifyRes.statusCode).toBe(404);
    });
  });

  describe('Doctor Access with Consent & Care Relationship Boundaries', () => {
    it('DOCTOR DENIED: should reject doctor access when NO consent exists (403)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/check-ins`,
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain("patient has not granted active consent for scope 'WELLNESS'");
    });

    it('DOCTOR DENIED: should reject doctor access when consent is for DIFFERENT scope (403)', async () => {
      // Grant consent for HEALTH_RECORDS, but NOT WELLNESS
      const consent = await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: careRelAId,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/check-ins`,
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).message).toContain(
        "patient has not granted active consent for scope 'WELLNESS'",
      );

      // Clean up
      await careRelRepo.updateConsent(consent.id, { status: ConsentStatus.REVOKED });
    });

    it('DOCTOR ALLOWED: should permit physician to view check-ins and trends when active WELLNESS consent is granted', async () => {
      // Grant active consent for WELLNESS
      const consent = await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: careRelAId,
        scope: ConsentScope.WELLNESS,
        status: ConsentStatus.ACTIVE,
      });

      // Doctor queries patient check-ins
      const checkInsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/check-ins`,
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(checkInsRes.statusCode).toBe(200);
      const checkInsBody = JSON.parse(checkInsRes.payload);
      expect(checkInsBody.data).toBeInstanceOf(Array);

      // Doctor queries patient trends
      const trendsRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/trends`,
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(trendsRes.statusCode).toBe(200);
      const trendsBody = JSON.parse(trendsRes.payload);
      expect(trendsBody.period).toBe('7d');

      // Now Revoke Consent
      await careRelRepo.updateConsent(consent.id, {
        status: ConsentStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: PATIENT_A_USER,
      });

      // Query again -> must be 403 Forbidden!
      const afterRevokeRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/check-ins`,
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(afterRevokeRes.statusCode).toBe(403);
    });

    it('DOCTOR DENIED: should reject doctor access when consent has EXPIRED (403)', async () => {
      // Create expired consent
      const expiredConsent = await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        careRelationshipId: careRelAId,
        scope: ConsentScope.WELLNESS,
        status: ConsentStatus.ACTIVE,
        expiresAt: new Date(Date.now() - 60000), // expired 1 minute ago
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/check-ins`,
        headers: {
          'x-user-id': DOCTOR_VERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).message).toContain(
        "patient consent for scope 'WELLNESS' has expired",
      );

      // Clean up
      await careRelRepo.updateConsent(expiredConsent.id, { status: ConsentStatus.EXPIRED });
    });

    it('DOCTOR DENIED: should reject unverified doctor with 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/wellness/check-ins`,
        headers: {
          'x-user-id': DOCTOR_UNVERIFIED_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.payload).message).toContain('Access denied');
    });
  });
});
