// ==============================================================================
// MANVIA — Patient Domain End-to-End (E2E) Test Suite
// ==============================================================================
// Phase 6: Full HTTP Lifecycle for Patient Profile, IDOR & Mass Assignment
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../src/main.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { BiologicalSex, Role } from '@prisma/client';

describe('Patient Domain API E2E (/api/v1/patients)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const patientAEmail = `e2e_patient_a_${Date.now()}@example.com`;
  const patientBEmail = `e2e_patient_b_${Date.now()}@example.com`;
  const doctorOnlyEmail = `e2e_doctor_only_${Date.now()}@example.com`;
  const testPassword = 'Str0ngP@ssw0rd!2026';

  let patientAToken: string;
  let patientBToken: string;
  let doctorOnlyToken: string;
  let doctorOnlyUserId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);

    // 1. Register Patient A
    const regA = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: patientAEmail, password: testPassword },
    });
    const dataA = JSON.parse(regA.body);
    patientAToken = dataA.accessToken;

    // 2. Register Patient B
    const regB = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: patientBEmail, password: testPassword },
    });
    const dataB = JSON.parse(regB.body);
    patientBToken = dataB.accessToken;

    // 3. Register and configure Doctor-only user
    const regDoc = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: doctorOnlyEmail, password: testPassword },
    });
    const dataDoc = JSON.parse(regDoc.body);
    doctorOnlyUserId = dataDoc.user.id;

    await prisma.user.update({
      where: { id: doctorOnlyUserId },
      data: { roles: [Role.DOCTOR] },
    });

    const loginDoc = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: doctorOnlyEmail, password: testPassword },
    });
    doctorOnlyToken = JSON.parse(loginDoc.body).accessToken;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: { in: [patientAEmail, patientBEmail, doctorOnlyEmail] },
        },
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('Unauthenticated Access (401 Unauthorized)', () => {
    it('GET /api/v1/patients/me — should reject unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/me',
      });
      expect(res.statusCode).toBe(401);
    });

    it('POST /api/v1/patients/me — should reject unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/patients/me',
        payload: { legalFirstName: 'Test' },
      });
      expect(res.statusCode).toBe(401);
    });

    it('PATCH /api/v1/patients/me — should reject unauthenticated request with 401', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/patients/me',
        payload: { preferredLanguage: 'hi' },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/v1/patients/me — Profile Retrieval & Missing State (404)', () => {
    it('should return 404 Not Found when patient profile does not yet exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
      });
      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('Patient profile not found');
    });
  });

  describe('POST /api/v1/patients/me — Profile Initialization & Duplicate Prevention', () => {
    it('should successfully initialize a patient profile with 201 Created', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
        payload: {
          legalFirstName: 'Priya',
          legalLastName: 'Sharma',
          dateOfBirth: '1984-06-15',
          biologicalSex: BiologicalSex.FEMALE,
          bloodGroup: 'B+',
          emergencyContact: {
            name: 'Anil Sharma',
            phone: '+14155552671',
            relationship: 'SPOUSE',
          },
          preferredLanguage: 'en',
          timezone: 'Asia/Kolkata',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBeDefined();
      expect(body.publicPatientId).toMatch(/^PAT-[0-9A-F]{8}$/);
      expect(body.legalFirstName).toBe('Priya');
      expect(body.legalLastName).toBe('Sharma');
      expect(body.biologicalSex).toBe('FEMALE');
      expect(body.bloodGroup).toBe('B+');
      expect(body.emergencyContact?.name).toBe('Anil Sharma');
      expect(body.emergencyContact?.relationship).toBe('SPOUSE');

      // Verify zero sensitive authentication credential leakage
      expect(body.password).toBeUndefined();
      expect(body.passwordHash).toBeUndefined();
      expect(body.userId).toBeUndefined();
    });

    it('should reject duplicate creation attempt with 409 Conflict', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
        payload: { legalFirstName: 'Duplicate' },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/patients/me — Profile Retrieval & IDOR Protection', () => {
    it('should return 200 with profile for authenticated patient', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.legalFirstName).toBe('Priya');
      expect(body.publicPatientId).toMatch(/^PAT-[0-9A-F]{8}$/);
    });

    it('IDOR MITIGATION: Patient B receives their own isolated profile, never Patient A', async () => {
      // First initialize profile for Patient B
      await app.inject({
        method: 'POST',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientBToken}` },
        payload: {
          legalFirstName: 'Rohan',
          legalLastName: 'Verma',
          biologicalSex: BiologicalSex.MALE,
        },
      });

      // Patient B calls /me
      const resB = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientBToken}` },
      });

      expect(resB.statusCode).toBe(200);
      const bodyB = JSON.parse(resB.body);
      expect(bodyB.legalFirstName).toBe('Rohan');

      // Patient A calls /me
      const resA = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
      });

      expect(resA.statusCode).toBe(200);
      const bodyA = JSON.parse(resA.body);
      expect(bodyA.legalFirstName).toBe('Priya');
      expect(bodyA.publicPatientId).not.toBe(bodyB.publicPatientId);
    });
  });

  describe('PATCH /api/v1/patients/me — Profile Updates & Mass Assignment Protection', () => {
    it('should update permitted demographic fields with 200 OK', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
        payload: {
          preferredLanguage: 'hi',
          emergencyContact: {
            name: 'Anil Sharma Updated',
            phone: '+14155559999',
            relationship: 'HUSBAND',
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.preferredLanguage).toBe('hi');
      expect(body.emergencyContact?.name).toBe('Anil Sharma Updated');
      expect(body.emergencyContact?.phone).toBe('+14155559999');
    });

    it('MASS ASSIGNMENT PROTECTION: Should reject request with 400 when attempting to update protected fields', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${patientAToken}` },
        payload: {
          preferredLanguage: 'en',
          role: 'ADMIN', // Forbidden non-whitelisted property
          userId: '00000000-0000-0000-0000-000000000000',
          publicPatientId: 'PAT-HACKED12',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error).toBe('VALIDATION_FAILED');
      expect(body.message).toBe('Request validation failed');
      expect(JSON.stringify(body.details)).toContain('property role should not exist');
    });
  });

  describe('Role-Based Access Control (403 Forbidden)', () => {
    it('should forbid non-patient user (Doctor-only) from accessing patient profile with 403', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/patients/me',
        headers: { authorization: `Bearer ${doctorOnlyToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.message).toContain('insufficient role privileges');
    });
  });
});
