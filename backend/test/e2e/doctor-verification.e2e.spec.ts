import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DOCTORS_REPOSITORY } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import type { IDoctorsRepository } from '../../src/modules/doctors/interfaces/doctor-repository.interface.js';
import { VerificationDocumentType } from '../../src/modules/doctor-verification/enums/verification-document-type.enum.js';
import { DoctorVerificationStatus } from '../../src/modules/doctor-verification/enums/doctor-verification-status.enum.js';
import {
  setupE2EApp,
  createE2EUser,
  cleanupE2EUsers,
  type E2EUser,
} from './helpers/auth.helper.js';

describe('Doctor Verification HTTP API (E2E)', () => {
  let app: NestFastifyApplication;

  let doctor1: E2EUser;
  let doctor2: E2EUser;
  let adminUser: E2EUser;
  let admin2User: E2EUser;
  let patientUser: E2EUser;

  beforeAll(async () => {
    app = await setupE2EApp();

    doctor1 = await createE2EUser(app, { role: 'DOCTOR' });
    doctor2 = await createE2EUser(app, { role: 'DOCTOR' });
    adminUser = await createE2EUser(app, { role: 'ADMIN' });
    admin2User = await createE2EUser(app, { role: 'ADMIN' });
    patientUser = await createE2EUser(app, { role: 'PATIENT' });

    const repo = app.get<IDoctorsRepository>(DOCTORS_REPOSITORY);
    const specialties = await repo.findActiveSpecialties();
    const languages = await repo.findAllLanguages();

    // Create Doctor 1 Profile
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: doctor1.headers,
      payload: {
        displayName: 'Dr. Meredith Grey',
        medicalRegistrationNumber: 'MED-E2E-GREY-01',
        licensingCouncil: 'Washington State Medical Commission',
        yearsOfExperience: 8,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });

    // Create Doctor 2 Profile
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/profile',
      headers: doctor2.headers,
      payload: {
        displayName: 'Dr. Derek Shepherd',
        medicalRegistrationNumber: 'MED-E2E-SHEP-02',
        licensingCouncil: 'Washington State Medical Commission',
        yearsOfExperience: 14,
        specialties: [{ specialtyId: specialties[0]!.id, isPrimary: true }],
        languages: [{ languageId: languages[0]!.id }],
      },
    });
  }, 60000);

  afterAll(async () => {
    if (app) {
      await cleanupE2EUsers(app, [
        doctor1?.email,
        doctor2?.email,
        adminUser?.email,
        admin2User?.email,
        patientUser?.email,
      ]);
      await app.close();
    }
  });

  // ----------------------------------------------------------------------------
  // 1. Doctor Self-Service Workflow
  // ----------------------------------------------------------------------------

  let docVerificationId: string;
  let documentId: string;

  it('GET /api/v1/doctors/me/verification should return 200 with initial DRAFT workflow', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me/verification',
      headers: doctor1.headers,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe(DoctorVerificationStatus.DRAFT);
    expect(body.documents).toHaveLength(0);
    docVerificationId = body.id;
  });

  it('POST /api/v1/doctors/me/verification should update draft submission notes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification',
      headers: doctor1.headers,
      payload: {
        notes: 'Attached certified Washington state license.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.submissionNotes).toBe('Attached certified Washington state license.');
  });

  it('POST /api/v1/doctors/me/verification/documents should upload credential document metadata', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification/documents',
      headers: doctor1.headers,
      payload: {
        documentType: VerificationDocumentType.MEDICAL_LICENSE,
        originalFileName: 'wa_state_license.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 245000,
        contentBase64: Buffer.from('PDF_STREAM_MOCK').toString('base64'),
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toBeDefined();
    expect(body.documentType).toBe(VerificationDocumentType.MEDICAL_LICENSE);
    expect(body.originalFileName).toBe('wa_state_license.pdf');
    documentId = body.id;
  });

  it('GET /api/v1/doctors/me/verification/documents/:documentId/access should return 200 with signed URL', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/doctors/me/verification/documents/${documentId}/access`,
      headers: doctor1.headers,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.documentId).toBe(documentId);
    expect(body.accessUrl).toContain('vault.manvia.internal');
    expect(body.expiresInSeconds).toBe(300);
  });

  it('POST /api/v1/doctors/me/verification/submit should transition submission to PENDING_REVIEW', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification/submit',
      headers: doctor1.headers,
      payload: {
        notes: 'Submitting all verified credentials for hospital privileges.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe(DoctorVerificationStatus.PENDING_REVIEW);
    expect(body.submittedAt).not.toBeNull();
  });

  // ----------------------------------------------------------------------------
  // 2. Admin Review & Decision Workflow
  // ----------------------------------------------------------------------------

  it('GET /api/v1/admin/doctor-verifications should list pending submissions for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/doctor-verifications?status=PENDING_REVIEW',
      headers: adminUser.headers,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBeGreaterThanOrEqual(1);
    const target = body.items.find((i: { id: string }) => i.id === docVerificationId);
    expect(target).toBeDefined();
    expect(target.doctorProfile.displayName).toBe('Dr. Meredith Grey');
    expect(target.documents).toHaveLength(1);
  });

  it('GET /api/v1/admin/doctor-verifications/:id should return full details and documents for review', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/doctor-verifications/${docVerificationId}`,
      headers: adminUser.headers,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(docVerificationId);
    expect(body.doctorProfile.medicalRegistrationNumber).toBe('MED-E2E-GREY-01');
    expect(body.documents[0].id).toBe(documentId);
  });

  it('GET /api/v1/admin/doctor-verifications/:id/documents/:docId/access should allow reviewer to inspect credential', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/doctor-verifications/${docVerificationId}/documents/${documentId}/access`,
      headers: adminUser.headers,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessUrl).toBeDefined();
    expect(body.expiresInSeconds).toBe(600);
  });

  it('POST /api/v1/admin/doctor-verifications/:id/approve should approve verification and update physician status', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/doctor-verifications/${docVerificationId}/approve`,
      headers: adminUser.headers,
      payload: {
        notes: 'Medical board registry check passed.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe(DoctorVerificationStatus.APPROVED);
    expect(body.reviewedBy).toBe(adminUser.id);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].action).toBe('APPROVED');

    // Confirm doctor's profile now reflects VERIFIED status
    const profileRes = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me',
      headers: doctor1.headers,
    });
    expect(profileRes.statusCode).toBe(200);
    const profileBody = JSON.parse(profileRes.body);
    expect(profileBody.verificationStatus).toBe('VERIFIED');
    expect(profileBody.verifiedAt).not.toBeNull();
  });

  // ----------------------------------------------------------------------------
  // 3. Concurrency & State Guard Tests
  // ----------------------------------------------------------------------------

  it('POST /api/v1/admin/doctor-verifications/:id/approve should return 409 Conflict if already approved', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/doctor-verifications/${docVerificationId}/approve`,
      headers: admin2User.headers,
      payload: {},
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('already been approved');
  });

  it('POST /api/v1/admin/doctor-verifications/:id/reject should return 409 Conflict if already approved', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/doctor-verifications/${docVerificationId}/reject`,
      headers: admin2User.headers,
      payload: {
        reason: 'Attempting to reject an approved doctor',
      },
    });

    expect(res.statusCode).toBe(409);
  });

  // ----------------------------------------------------------------------------
  // 4. Rejection and Resubmission Flow
  // ----------------------------------------------------------------------------

  let doc2VerificationId: string;

  it('should handle rejection and subsequent resubmission for Doctor 2', async () => {
    // 1. Upload document for Doctor 2
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification/documents',
      headers: doctor2.headers,
      payload: {
        documentType: VerificationDocumentType.MEDICAL_LICENSE,
        originalFileName: 'old_license.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 100000,
      },
    });

    // 2. Submit for review
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification/submit',
      headers: doctor2.headers,
      payload: {},
    });
    expect(submitRes.statusCode).toBe(200);
    doc2VerificationId = JSON.parse(submitRes.body).id;

    // 3. Admin rejects without reason -> 400 Bad Request
    const rejectNoReason = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/doctor-verifications/${doc2VerificationId}/reject`,
      headers: adminUser.headers,
      payload: { reason: '' },
    });
    expect(rejectNoReason.statusCode).toBe(400);

    // 4. Admin rejects with valid reason
    const rejectRes = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/doctor-verifications/${doc2VerificationId}/reject`,
      headers: adminUser.headers,
      payload: {
        reason: 'License image is blurry and unreadable. Please upload a high-resolution PDF scan.',
      },
    });
    expect(rejectRes.statusCode).toBe(200);
    const rejectBody = JSON.parse(rejectRes.body);
    expect(rejectBody.status).toBe(DoctorVerificationStatus.REJECTED);
    expect(rejectBody.rejectionReason).toContain('License image is blurry');

    // 5. Doctor checks verification status and sees remediation reason
    const docStatusRes = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me/verification',
      headers: doctor2.headers,
    });
    expect(docStatusRes.statusCode).toBe(200);
    const docStatusBody = JSON.parse(docStatusRes.body);
    expect(docStatusBody.status).toBe(DoctorVerificationStatus.REJECTED);
    expect(docStatusBody.rejectionReason).toContain('blurry');

    // 6. Doctor uploads new document and resubmits
    await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification/documents',
      headers: doctor2.headers,
      payload: {
        documentType: VerificationDocumentType.MEDICAL_LICENSE,
        originalFileName: 'high_res_license.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 300000,
      },
    });

    const resubmitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/doctors/me/verification/submit',
      headers: doctor2.headers,
      payload: {
        notes: 'Uploaded clear scan.',
      },
    });
    expect(resubmitRes.statusCode).toBe(200);
    expect(JSON.parse(resubmitRes.body).status).toBe(DoctorVerificationStatus.PENDING_REVIEW);
  });

  // ----------------------------------------------------------------------------
  // 5. Security & RBAC Enforcements
  // ----------------------------------------------------------------------------

  it('SECURITY: Unauthenticated user should be rejected with 401 on doctor endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me/verification',
    });
    expect(res.statusCode).toBe(401);
  });

  it('SECURITY: Unauthenticated user should be rejected with 401 on admin endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/doctor-verifications',
    });
    expect(res.statusCode).toBe(401);
  });

  it('SECURITY: Patient role should be rejected with 403 on doctor verification endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me/verification',
      headers: patientUser.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('SECURITY: Forged identity headers cannot escalate patient to doctor or admin', async () => {
    const resDoctor = await app.inject({
      method: 'GET',
      url: '/api/v1/doctors/me/verification',
      headers: {
        ...patientUser.headers,
        'x-user-id': doctor1.id,
        'x-user-role': 'DOCTOR',
        'x-active-role': 'DOCTOR',
      },
    });
    expect(resDoctor.statusCode).toBe(403);

    const resAdmin = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/doctor-verifications',
      headers: {
        ...patientUser.headers,
        'x-user-id': adminUser.id,
        'x-user-role': 'ADMIN',
        'x-active-role': 'ADMIN',
      },
    });
    expect(resAdmin.statusCode).toBe(403);
  });

  it('SECURITY: Patient role should be rejected with 403 on admin verification endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/doctor-verifications',
      headers: patientUser.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('SECURITY: Doctor role should be rejected with 403 on admin endpoints', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/doctor-verifications',
      headers: doctor1.headers,
    });
    expect(res.statusCode).toBe(403);
  });

  it('SECURITY: Doctor cannot self-approve their own verification', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/doctor-verifications/${docVerificationId}/approve`,
      headers: doctor1.headers,
      payload: {},
    });
    expect(res.statusCode).toBe(403);
  });

  it('SECURITY: Doctor A cannot access Doctor B verification document', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/doctors/me/verification/documents/${documentId}/access`,
      headers: doctor2.headers,
    });
    expect(res.statusCode).toBe(403);
  });
});
