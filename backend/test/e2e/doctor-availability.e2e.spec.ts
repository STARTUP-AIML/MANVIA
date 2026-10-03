import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { DayOfWeek } from '../../src/modules/doctor-availability/enums/day-of-week.enum.js';
import { ConsultationType } from '../../src/modules/doctor-availability/enums/consultation-type.enum.js';
import { OfferStatus } from '../../src/modules/doctor-availability/enums/offer-status.enum.js';

describe('Doctor Availability & Consultation Offers HTTP API (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;

  const DOCTOR_A_USER = 'usr-e2e-avail-a';
  const DOCTOR_B_USER = 'usr-e2e-avail-b';
  const PATIENT_USER = 'usr-e2e-patient-avail';

  let docAPublicId: string;
  let docBPublicId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    doctorsRepo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    const specialties = await doctorsRepo.findActiveSpecialties();
    const languages = await doctorsRepo.findAllLanguages();

    // Create Doctor A Profile
    const resA = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        'x-user-id': DOCTOR_A_USER,
        'x-user-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. Allison Cameron',
        medicalRegistrationNumber: 'MED-E2E-CAM-01',
        licensingCouncil: 'New Jersey Board of Medical Examiners',
        yearsOfExperience: 9,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
    const parsedA = JSON.parse(resA.payload);
    docAPublicId = parsedA.publicDoctorId;

    // Create Doctor B Profile
    const resB = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        'x-user-id': DOCTOR_B_USER,
        'x-user-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. Robert Chase',
        medicalRegistrationNumber: 'MED-E2E-CHASE-02',
        licensingCouncil: 'New Jersey Board of Medical Examiners',
        yearsOfExperience: 10,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
    const parsedB = JSON.parse(resB.payload);
    docBPublicId = parsedB.publicDoctorId;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // ==========================================================================
  // 1. Doctor Availability Self-Service
  // ==========================================================================
  describe('Doctor Availability Management (/api/v1/doctors/me/availability)', () => {
    let createdRuleId: string;

    it('POST should create availability rule with valid IANA timezone and hours (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          timezone: 'America/New_York',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00',
          endTime: '13:00',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
      expect(body.timezone).toBe('America/New_York');
      expect(body.dayOfWeek).toBe(DayOfWeek.MONDAY);
      expect(body.startTime).toBe('09:00');
      expect(body.endTime).toBe('13:00');
      expect(body.isActive).toBe(true);

      createdRuleId = body.id;
    });

    it('POST should support disjoint window on same weekday for lunch/clinical breaks (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          timezone: 'America/New_York',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '14:00',
          endTime: '18:00',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.startTime).toBe('14:00');
      expect(body.endTime).toBe('18:00');
    });

    it('POST should reject overlapping availability window on same weekday (409)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          timezone: 'America/New_York',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '12:00',
          endTime: '15:00', // overlaps 09:00-13:00 and 14:00-18:00
        },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('CONFLICT');
    });

    it('POST should reject non-IANA abbreviations like EST or IST (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          timezone: 'EST',
          dayOfWeek: DayOfWeek.TUESDAY,
          startTime: '09:00',
          endTime: '12:00',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('VALIDATION_FAILED');
    });

    it('POST should reject cross-midnight window with explicit instructions (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          timezone: 'Europe/London',
          dayOfWeek: DayOfWeek.FRIDAY,
          startTime: '22:00',
          endTime: '02:00',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('Cross-midnight availability windows');
    });

    it('GET should return list of doctor availability rules (200)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.length).toBeGreaterThanOrEqual(2);
    });

    it('PATCH should update availability rule hours (200)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/doctors/me/availability/${createdRuleId}`,
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          startTime: '08:30',
          endTime: '12:30',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.startTime).toBe('08:30');
      expect(body.endTime).toBe('12:30');
    });

    it('DELETE should remove availability rule (200)', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/doctors/me/availability/${createdRuleId}`,
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Consultation Offers Self-Service
  // ==========================================================================
  describe('Consultation Offers Management (/api/v1/doctors/me/consultation-offers)', () => {
    let createdOfferId: string;

    it('POST should create consultation offer with pricing metadata (201)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/consultation-offers',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          title: 'Comprehensive Diagnostic Evaluation',
          description: '45-minute multi-system symptom investigation',
          consultationType: ConsultationType.INITIAL,
          durationMinutes: 45,
          fee: 175.0,
          currency: 'USD',
          status: OfferStatus.ACTIVE,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.id).toBeDefined();
      expect(body.title).toBe('Comprehensive Diagnostic Evaluation');
      expect(body.durationMinutes).toBe(45);
      expect(body.fee).toBe(175.0);
      expect(body.currency).toBe('USD');
      expect(body.status).toBe(OfferStatus.ACTIVE);

      createdOfferId = body.id;
    });

    it('POST should reject invalid duration <= 0 (400)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/consultation-offers',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          title: 'Invalid Duration Consult',
          consultationType: ConsultationType.GENERAL,
          durationMinutes: 0,
          fee: 100.0,
        },
      });

      expect(res.statusCode).toBe(400);
    });

    it('POST should reject duplicate active offer with same title and duration (409)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/consultation-offers',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          title: 'Comprehensive Diagnostic Evaluation',
          consultationType: ConsultationType.INITIAL,
          durationMinutes: 45,
          fee: 200.0,
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('GET should list all consultation offers for authenticated doctor (200)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors/me/consultation-offers',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('PATCH should update consultation offer fee and status (200)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/doctors/me/consultation-offers/${createdOfferId}`,
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          fee: 195.0,
          status: OfferStatus.ACTIVE,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.fee).toBe(195.0);
    });
  });

  // ==========================================================================
  // 3. Authorization & Security Boundary Enforcement
  // ==========================================================================
  describe('Authorization & Multi-Tenant Security Enforcement', () => {
    it('SECURITY: Unauthenticated requests should be rejected with 401', async () => {
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors/me/availability',
      });
      expect(res1.statusCode).toBe(401);

      const res2 = await app.inject({
        method: 'GET',
        url: '/api/v1/doctors/me/consultation-offers',
      });
      expect(res2.statusCode).toBe(401);
    });

    it('SECURITY: Patient role should be rejected from doctor self-service with 403', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': PATIENT_USER,
          'x-user-role': 'PATIENT',
        },
        payload: {
          timezone: 'America/New_York',
          dayOfWeek: DayOfWeek.MONDAY,
          startTime: '09:00',
          endTime: '12:00',
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('SECURITY: Doctor B cannot update Doctor A availability rule (403)', async () => {
      // Doctor A creates a rule
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/availability',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          timezone: 'America/New_York',
          dayOfWeek: DayOfWeek.WEDNESDAY,
          startTime: '10:00',
          endTime: '14:00',
        },
      });
      const ruleAId = JSON.parse(createRes.payload).id;

      // Doctor B attempts to modify it
      const tamperRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/doctors/me/availability/${ruleAId}`,
        headers: {
          'x-user-id': DOCTOR_B_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          startTime: '11:00',
        },
      });

      expect(tamperRes.statusCode).toBe(403);
    });

    it('SECURITY: Doctor B cannot update Doctor A consultation offer (403)', async () => {
      // Doctor A creates an offer
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/consultation-offers',
        headers: {
          'x-user-id': DOCTOR_A_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          title: 'Specialty Consult A',
          consultationType: ConsultationType.SPECIALIST,
          durationMinutes: 60,
          fee: 250.0,
        },
      });
      const offerAId = JSON.parse(createRes.payload).id;

      // Doctor B attempts to modify it
      const tamperRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/doctors/me/consultation-offers/${offerAId}`,
        headers: {
          'x-user-id': DOCTOR_B_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          fee: 10.0,
        },
      });

      expect(tamperRes.statusCode).toBe(403);
    });
  });

  // ==========================================================================
  // 4. Patient Discovery & Authoritative Verification Rule
  // ==========================================================================
  describe('Patient Discovery — Authoritative Verification Rule', () => {
    it('VERIFIED DOCTOR RULE: unverified Doctor B should return 404 on public offers discovery', async () => {
      // Doctor B creates an offer
      await app.inject({
        method: 'POST',
        url: '/api/v1/doctors/me/consultation-offers',
        headers: {
          'x-user-id': DOCTOR_B_USER,
          'x-user-role': 'DOCTOR',
        },
        payload: {
          title: 'Dr. Chase General Checkup',
          consultationType: ConsultationType.GENERAL,
          durationMinutes: 30,
          fee: 90.0,
        },
      });

      // Public patient attempts discovery on unverified Doctor B
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/${docBPublicId}/offers`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.message).toContain('not currently an active verified consultation provider');
    });

    it('VERIFIED DOCTOR RULE: unverified Doctor B should return 404 on public availability discovery', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/${docBPublicId}/availability`,
      });

      expect(res.statusCode).toBe(404);
    });

    it('should return 200 with offers and availability once Doctor A is officially VERIFIED', async () => {
      // Upgrade Doctor A to VERIFIED via doctors repository
      const docAProfile = await doctorsRepo.findByUserId(DOCTOR_A_USER);
      expect(docAProfile).toBeDefined();
      await doctorsRepo.updateVerificationStatus(
        docAProfile!.id,
        VerificationStatus.VERIFIED,
        new Date(),
      );

      // Public discovery of offers for Doctor A
      const offersRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/${docAPublicId}/offers`,
      });

      expect(offersRes.statusCode).toBe(200);
      const offersBody = JSON.parse(offersRes.payload);
      expect(offersBody.length).toBeGreaterThanOrEqual(1);
      // Ensure only public DTO fields are returned
      expect(offersBody[0].title).toBeDefined();
      expect(offersBody[0].fee).toBeDefined();
      expect(offersBody[0].durationMinutes).toBeDefined();
      expect(offersBody[0].doctorId).toBeUndefined(); // internal doctorId must NOT leak

      // Public discovery of availability for Doctor A
      const availRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/${docAPublicId}/availability`,
      });

      expect(availRes.statusCode).toBe(200);
      const availBody = JSON.parse(availRes.payload);
      expect(availBody.length).toBeGreaterThanOrEqual(1);
      expect(availBody[0].dayOfWeek).toBeDefined();
      expect(availBody[0].startTime).toBeDefined();
      expect(availBody[0].endTime).toBeDefined();
      expect(availBody[0].doctorId).toBeUndefined(); // internal doctorId must NOT leak
    });
  });
});
