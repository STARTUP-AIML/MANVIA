import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConsentScope } from '../../src/modules/care-relationships/enums/consent-scope.enum.js';
import { CareRelationshipStatus } from '../../src/modules/care-relationships/enums/care-relationship-status.enum.js';
import { ConsentStatus } from '../../src/modules/care-relationships/enums/consent-status.enum.js';
import { CARE_RELATIONSHIP_REPOSITORY } from '../../src/modules/care-relationships/interfaces/care-relationship-repository.interface.js';
import type { ICareRelationshipRepository } from '../../src/modules/care-relationships/interfaces/care-relationship-repository.interface.js';
import { HealthRecordCategory } from '../../src/modules/health-records/enums/health-record-category.enum.js';
import { HealthRecordStatus } from '../../src/modules/health-records/enums/health-record-status.enum.js';
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from './helpers/auth.helper.js';

describe('Health Records & Health Timeline HTTP API (E2E)', () => {
  let app: NestFastifyApplication;
  let doctorsRepo: IDoctorsRepository;
  let careRelRepo: ICareRelationshipRepository;

  let doctorVerified: E2EUser;
  let patientAUser: E2EUser;
  let patientBUser: E2EUser;

  let doctorAInternalId: string;
  let patientAInternalId: string;
  let patientAPublicId: string;

  beforeAll(async () => {
    app = await setupE2EApp();

    doctorVerified = await createE2EUser(app, { role: 'DOCTOR' });
    patientAUser = await createE2EUser(app, { role: 'PATIENT' });
    patientBUser = await createE2EUser(app, { role: 'PATIENT' });

    doctorsRepo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    careRelRepo = app.get<ICareRelationshipRepository>(CARE_RELATIONSHIP_REPOSITORY);

    const specialties = await doctorsRepo.findActiveSpecialties();
    const languages = await doctorsRepo.findAllLanguages();

    // 1. Create Verified Doctor
    const resDocA = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: doctorVerified.headers,
      payload: {
        displayName: 'Dr. Allison Cameron, MD',
        medicalRegistrationNumber: 'MED-E2E-HR-01',
        licensingCouncil: 'NJ Board',
        yearsOfExperience: 12,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
    expect(resDocA.statusCode).toBe(201);
    const docAProfile = await doctorsRepo.findByUserId(doctorVerified.id);
    await doctorsRepo.updateVerificationStatus(
      docAProfile!.id,
      VerificationStatus.VERIFIED,
      new Date(),
    );
    doctorAInternalId = docAProfile!.id;

    // 2. Create Patient A profile
    const patA = await careRelRepo.createPatientProfile(patientAUser.id, {
      publicPatientId: 'PAT-HRE2E001',
      legalFirstName: 'Alice',
      legalLastName: 'Smith',
      displayName: 'Alice S.',
    });
    patientAInternalId = patA.id;
    patientAPublicId = patA.publicPatientId;

    // 3. Create Patient B profile
    await careRelRepo.createPatientProfile(patientBUser.id, {
      publicPatientId: 'PAT-HRE2E002',
      legalFirstName: 'Bob',
      legalLastName: 'Jones',
      displayName: 'Bob J.',
    });
  }, 60000);

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [doctorVerified?.email, patientAUser?.email, patientBUser?.email]);
      await app.close();
    }
  });

  describe('Unauthenticated & Role Guard Protections', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health-records',
      });
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when a doctor attempts patient-only endpoint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health-records',
        headers: doctorVerified.headers,
      });
      expect(res.statusCode).toBe(403);
    });

    it('SECURITY: Forged identity headers cannot grant DOCTOR access to patient health-records', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health-records',
        headers: {
          ...doctorVerified.headers,
          'x-user-id': patientAUser.id,
          'x-user-role': 'PATIENT',
          'x-active-role': 'PATIENT',
        },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Patient Health Records Lifecycle', () => {
    let createdRecordPublicId: string;

    it('should request an upload intent with presigned URL', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/health-records/upload-intent',
        headers: patientAUser.headers,
        payload: {
          fileName: 'comprehensive_metabolic_panel.pdf',
          mimeType: 'application/pdf',
          fileSizeBytes: 204800,
          category: HealthRecordCategory.LAB_REPORT,
          title: 'Metabolic Panel 2026',
          recordedDate: '2026-09-15',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.recordId).toBeDefined();
      expect(body.publicRecordId).toMatch(/^REC-[A-Z0-9]{8}$/);
      expect(body.uploadUrl).toContain('vault.manvia.internal');
      expect(body.expiresInSeconds).toBe(300);

      createdRecordPublicId = body.publicRecordId;
    });

    it('should finalize the uploaded record and verify AVAILABLE status', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/health-records/${createdRecordPublicId}/finalize`,
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(HealthRecordStatus.AVAILABLE);
      expect(body.publicRecordId).toBe(createdRecordPublicId);
    });

    it('should directly create a second record', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/health-records',
        headers: patientAUser.headers,
        payload: {
          category: HealthRecordCategory.PRESCRIPTION,
          title: 'Metformin 500mg Rx',
          fileName: 'rx_metformin.pdf',
          fileMimeType: 'application/pdf',
          recordedDate: '2026-09-18',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Metformin 500mg Rx');
      expect(body.status).toBe(HealthRecordStatus.AVAILABLE);
    });

    it('should list records with pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health-records?limit=10',
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBe(2);
      expect(body.data).toHaveLength(2);
    });

    it('should retrieve single record details by public ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/health-records/${createdRecordPublicId}`,
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.publicRecordId).toBe(createdRecordPublicId);
      expect(body.title).toBe('Metabolic Panel 2026');
    });

    it('should generate a short-lived download URL', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/health-records/${createdRecordPublicId}/download-url`,
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.downloadUrl).toContain('vault.manvia.internal');
      expect(body.expiresInSeconds).toBe(300);
    });

    it('should update record metadata', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/health-records/${createdRecordPublicId}`,
        headers: patientAUser.headers,
        payload: {
          title: 'Comprehensive Metabolic Panel (Updated)',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.title).toBe('Comprehensive Metabolic Panel (Updated)');
    });

    it('should soft-delete a record', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/health-records/${createdRecordPublicId}`,
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe(HealthRecordStatus.DELETED);

      // Verify active list count decremented
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/health-records',
        headers: patientAUser.headers,
      });
      const listBody = JSON.parse(listRes.body);
      expect(listBody.total).toBe(1);
    });
  });

  describe('Patient Health Timeline', () => {
    it('should retrieve chronological timeline events', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health-timeline',
        headers: patientAUser.headers,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(body.data[0]!.publicEventId).toMatch(/^EVT-[A-Z0-9]{8}$/);
    });
  });

  describe('Doctor Access Boundaries & Consent Enforcement', () => {
    let activeRecordPublicId: string;

    beforeAll(async () => {
      // Create a fresh active record for Patient A
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/health-records',
        headers: patientAUser.headers,
        payload: {
          category: HealthRecordCategory.LAB_REPORT,
          title: 'Active Cholesterol Panel',
          fileName: 'active_chol.pdf',
          fileMimeType: 'application/pdf',
          recordedDate: '2026-09-25',
        },
      });
      const body = JSON.parse(res.body);
      activeRecordPublicId = body.publicRecordId;
    });

    it('should return 403 when doctor has no care relationship with patient', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-records`,
        headers: doctorVerified.headers,
      });
      expect(res.statusCode).toBe(403);
    });

    it('should return 403 when care relationship exists but no HEALTH_RECORDS consent', async () => {
      await careRelRepo.createCareRelationship({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        status: CareRelationshipStatus.ACTIVE,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-records`,
        headers: doctorVerified.headers,
      });
      expect(res.statusCode).toBe(403);
    });

    it('should return 200 when active care relationship and HEALTH_RECORDS consent exist', async () => {
      await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        scope: ConsentScope.HEALTH_RECORDS,
        status: ConsentStatus.ACTIVE,
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-records`,
        headers: doctorVerified.headers,
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.body);
      expect(listBody.total).toBeGreaterThanOrEqual(1);

      const recordRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-records/${activeRecordPublicId}`,
        headers: doctorVerified.headers,
      });
      expect(recordRes.statusCode).toBe(200);

      const downloadRes = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-records/${activeRecordPublicId}/download-url`,
        headers: doctorVerified.headers,
      });
      expect(downloadRes.statusCode).toBe(200);
    });

    it('should enforce HEALTH_TIMELINE scope on doctor timeline endpoint', async () => {
      // Currently doctor only has HEALTH_RECORDS consent, not HEALTH_TIMELINE
      const timelineResWithoutConsent = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-timeline`,
        headers: doctorVerified.headers,
      });
      expect(timelineResWithoutConsent.statusCode).toBe(403);

      // Now grant HEALTH_TIMELINE consent
      await careRelRepo.createConsent({
        patientId: patientAInternalId,
        doctorId: doctorAInternalId,
        scope: ConsentScope.HEALTH_TIMELINE,
        status: ConsentStatus.ACTIVE,
      });

      const timelineResWithConsent = await app.inject({
        method: 'GET',
        url: `/api/v1/doctors/me/patients/${patientAPublicId}/health-timeline`,
        headers: doctorVerified.headers,
      });
      expect(timelineResWithConsent.statusCode).toBe(200);
      const timelineBody = JSON.parse(timelineResWithConsent.body);
      expect(timelineBody.data).toBeDefined();
    });

    it('should isolate patient data (Patient B cannot access Patient A record)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/health-records/${activeRecordPublicId}`,
        headers: patientBUser.headers,
      });
      expect(res.statusCode).toBe(404);
    });
  });
});
