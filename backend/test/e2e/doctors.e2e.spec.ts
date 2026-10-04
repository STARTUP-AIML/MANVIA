import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from './helpers/auth.helper.js';

describe('Doctor Platform HTTP API (E2E)', () => {
  let app: NestFastifyApplication;
  let repo: IDoctorsRepository;
  let specialtyId: string;
  let languageId: string;

  let doctorA: E2EUser;
  let patientUser: E2EUser;
  let doctorAPublicId: string;

  beforeAll(async () => {
    app = await setupE2EApp();

    // Fetch seeded taxonomy references
    repo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    const specialties = await repo.findActiveSpecialties();
    const languages = await repo.findAllLanguages();
    specialtyId = specialties[0]!.id;
    languageId = languages[0]!.id;

    // Create real authenticated users through the trusted auth path
    doctorA = await createE2EUser(app, { role: 'DOCTOR' });
    patientUser = await createE2EUser(app, { role: 'PATIENT' });
  }, 60000);

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [doctorA?.email, patientUser?.email]);
      await app.close();
    }
  });

  // ----------------------------------------------------------------------------
  // Taxonomy Endpoints
  // ----------------------------------------------------------------------------

  it('GET /api/v1/doctors/specialties should return 200 with medical specialties taxonomy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/specialties',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('code');
    expect(body[0]).toHaveProperty('name');
    expect(body[0]).toHaveProperty('isActive');
  });

  it('GET /api/v1/doctors/languages should return 200 with supported languages taxonomy', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/languages',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toHaveProperty('code');
    expect(body[0]).toHaveProperty('name');
  });

  // ----------------------------------------------------------------------------
  // Authorization & Security Edge Cases
  // ----------------------------------------------------------------------------

  it('POST /api/v1/doctors/profile should reject unauthenticated requests with 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      payload: {
        displayName: 'Dr. No Auth',
        medicalRegistrationNumber: 'REG-NOAUTH-01',
        licensingCouncil: 'Board',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/doctors/profile should reject PATIENT role with 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: patientUser.headers,
      payload: {
        displayName: 'Dr. Impostor Patient',
        medicalRegistrationNumber: 'REG-PATIENT-01',
        licensingCouncil: 'Board',
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('FORBIDDEN');
  });

  it('POST /api/v1/doctors/profile should reject forged identity headers and enforce token identity', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: {
        ...patientUser.headers,
        'x-user-id': doctorA.id,
        'x-user-role': 'DOCTOR',
        'x-active-role': 'DOCTOR',
      },
      payload: {
        displayName: 'Dr. Forger',
        medicalRegistrationNumber: 'REG-FORGE-01',
        licensingCouncil: 'Board',
      },
    });

    // Caller identity is derived from verified token (PATIENT), ignoring forged headers
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('FORBIDDEN');
  });

  it('POST /api/v1/doctors/profile should reject mass assignment of verificationStatus with 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: doctorA.headers,
      payload: {
        displayName: 'Dr. Hacker',
        medicalRegistrationNumber: 'REG-HACK-01',
        licensingCouncil: 'Board',
        verificationStatus: 'VERIFIED', // Forbidden non-whitelisted property
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('VALIDATION_FAILED');
  });

  // ----------------------------------------------------------------------------
  // Doctor Profile Lifecycle: Create, Get Self, Patch, Public Retrieval
  // ----------------------------------------------------------------------------

  it('POST /api/v1/doctors/profile should initialize doctor profile with 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: doctorA.headers,
      payload: {
        displayName: 'Dr. Alice Smith, MD',
        medicalRegistrationNumber: 'MCI-STATE-88392',
        licensingCouncil: 'Medical Council of California',
        yearsOfExperience: 10,
        defaultConsultationFee: 75.0,
        currency: 'USD',
        bio: 'Cardiologist with clinical focus on preventative cardiology.',
        specialties: [{ specialtyId, isPrimary: true }],
        languages: [{ languageId }],
        qualifications: [
          {
            qualification: 'MD (Internal Medicine)',
            institution: 'Stanford University',
            graduationYear: 2014,
          },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.userId).toBe(doctorA.id);
    expect(body.publicDoctorId).toMatch(/^DOC-[A-Z0-9]{8}$/);
    expect(body.displayName).toBe('Dr. Alice Smith, MD');
    expect(body.verificationStatus).toBe('DRAFT');
    expect(body.medicalRegistrationNumber).toBe('MCI-STATE-88392');
    expect(body.specialties.length).toBe(1);
    expect(body.languages.length).toBe(1);
    expect(body.qualifications.length).toBe(1);

    doctorAPublicId = body.publicDoctorId;
  });

  it('POST /api/v1/doctors/profile should reject duplicate profile creation for same user with 409 Conflict', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: doctorA.headers,
      payload: {
        displayName: 'Dr. Alice Smith (Duplicate)',
        medicalRegistrationNumber: 'MCI-STATE-99999',
        licensingCouncil: 'Board',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('CONFLICT');
  });

  it('GET /api/v1/doctors/me should return authenticated doctor own private profile with 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me',
      headers: doctorA.headers,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.userId).toBe(doctorA.id);
    expect(body.publicDoctorId).toBe(doctorAPublicId);
    expect(body.medicalRegistrationNumber).toBe('MCI-STATE-88392');
    expect(body.licensingCouncil).toBe('Medical Council of California');
  });

  it('PATCH /api/v1/doctors/me should update permitted fields with 200 OK', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/doctors/me',
      headers: doctorA.headers,
      payload: {
        displayName: 'Dr. Alice Smith, MD, FACC',
        yearsOfExperience: 11,
        defaultConsultationFee: 85.0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.displayName).toBe('Dr. Alice Smith, MD, FACC');
    expect(body.yearsOfExperience).toBe(11);
    expect(body.defaultConsultationFee).toBe(85.0);
    // Immutability verified
    expect(body.publicDoctorId).toBe(doctorAPublicId);
    expect(body.verificationStatus).toBe('DRAFT');
  });

  it('PATCH /api/v1/doctors/me should reject attempts to self-verify status with 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/doctors/me',
      headers: doctorA.headers,
      payload: {
        verificationStatus: 'VERIFIED', // Non-whitelisted field
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('GET /api/v1/doctors/:doctorId should return 404 when doctor is not yet VERIFIED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/doctors/${doctorAPublicId}`,
    });

    expect(res.statusCode).toBe(404);
  });

  it('GET /api/v1/doctors/:doctorId should return public profile and strip sensitive fields once VERIFIED', async () => {
    const docProfile = await repo.findByUserId(doctorA.id);
    expect(docProfile).toBeDefined();
    await repo.updateVerificationStatus(docProfile!.id, VerificationStatus.VERIFIED, new Date());

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/doctors/${doctorAPublicId}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.publicDoctorId).toBe(doctorAPublicId);
    expect(body.displayName).toBe('Dr. Alice Smith, MD, FACC');
    expect(body.yearsOfExperience).toBe(11);
    expect(body.defaultConsultationFee).toBe(85.0);

    // Verify sensitive and internal fields are completely stripped
    expect(body.id).toBeUndefined();
    expect(body.userId).toBeUndefined();
    expect(body.medicalRegistrationNumber).toBeUndefined();
    expect(body.licensingCouncil).toBeUndefined();
  });

  it('GET /api/v1/doctors/:doctorId should return 404 when doctor does not exist', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/DOC-NONEXIST',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('NOT_FOUND');
  });

  it('GET /api/v1/doctors should return 200 with paginated public doctor list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors?limit=10&offset=0',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.limit).toBe(10);
    expect(body.offset).toBe(0);
  });
});
