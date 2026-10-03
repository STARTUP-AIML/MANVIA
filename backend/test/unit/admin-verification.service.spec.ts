import { describe, it, expect, beforeEach } from 'vitest';
import { AdminVerificationService } from '../../src/modules/doctor-verification/services/admin-verification.service.js';
import { DoctorVerificationService } from '../../src/modules/doctor-verification/services/doctor-verification.service.js';
import { InMemoryDoctorVerificationRepository } from '../../src/modules/doctor-verification/repositories/in-memory-verification.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { StorageService } from '../../src/modules/doctor-verification/services/storage.service.js';
import { VerificationAuditService } from '../../src/modules/doctor-verification/services/verification-audit.service.js';
import { DoctorVerificationStatus } from '../../src/modules/doctor-verification/enums/doctor-verification-status.enum.js';
import { VerificationDocumentType } from '../../src/modules/doctor-verification/enums/verification-document-type.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('AdminVerificationService (Unit Tests)', () => {
  let adminService: AdminVerificationService;
  let doctorService: DoctorVerificationService;
  let verificationRepo: InMemoryDoctorVerificationRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let storageService: StorageService;
  let auditService: VerificationAuditService;

  const DOCTOR_USER_ID = 'usr-doctor-001';
  const ADMIN_USER_ID = 'adm-reviewer-999';

  beforeEach(async () => {
    doctorsRepo = new InMemoryDoctorsRepository();
    verificationRepo = new InMemoryDoctorVerificationRepository(doctorsRepo);
    storageService = new StorageService();
    auditService = new VerificationAuditService();

    doctorService = new DoctorVerificationService(
      verificationRepo,
      doctorsRepo,
      storageService,
      auditService,
    );

    adminService = new AdminVerificationService(verificationRepo, storageService, auditService);

    await doctorsRepo.createProfile({
      userId: DOCTOR_USER_ID,
      publicDoctorId: 'DOC-VERIF01',
      displayName: 'Dr. Gregory House',
      medicalRegistrationNumber: 'MED-HOUSE-101',
      licensingCouncil: 'New Jersey Board of Medical Examiners',
      yearsOfExperience: 20,
    });
  });

  const setupSubmittedVerification = async () => {
    await doctorService.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'license_cert.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 150000,
    });
    return doctorService.submitVerification(DOCTOR_USER_ID, {
      notes: 'Please review my medical credentials',
    });
  };

  it('should list pending verification submissions', async () => {
    await setupSubmittedVerification();

    const list = await adminService.listVerifications({
      status: DoctorVerificationStatus.PENDING_REVIEW,
      limit: 10,
      offset: 0,
    });

    expect(list.total).toBe(1);
    expect(list.items).toHaveLength(1);
    expect(list.items[0]?.status).toBe(DoctorVerificationStatus.PENDING_REVIEW);
    expect(list.items[0]?.doctorProfile?.displayName).toBe('Dr. Gregory House');
  });

  it('should retrieve full verification details including documents and review history', async () => {
    const submitted = await setupSubmittedVerification();

    const details = await adminService.getVerificationDetails(submitted.id);
    expect(details.id).toBe(submitted.id);
    expect(details.documents).toHaveLength(1);
    expect(details.doctorProfile?.medicalRegistrationNumber).toBe('MED-HOUSE-101');
    expect(details.reviews).toHaveLength(0);
  });

  it('should approve a pending submission, updating status, reviewer identity, and doctor verified state', async () => {
    const submitted = await setupSubmittedVerification();

    const approved = await adminService.approveVerification(submitted.id, ADMIN_USER_ID, {
      notes: 'License verified directly with NJ Board.',
    });

    expect(approved.status).toBe(DoctorVerificationStatus.APPROVED);
    expect(approved.reviewedBy).toBe(ADMIN_USER_ID);
    expect(approved.reviewedAt).not.toBeNull();
    expect(approved.reviews).toHaveLength(1);
    expect(approved.reviews[0]?.action).toBe('APPROVED');
    expect(approved.reviews[0]?.reviewerAdminId).toBe(ADMIN_USER_ID);

    // Verify derived DoctorProfile state
    const doctorProfile = await doctorsRepo.findByUserId(DOCTOR_USER_ID);
    expect(doctorProfile?.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(doctorProfile?.verifiedAt).not.toBeNull();

    // Verify audit event
    const auditLogs = await auditService.getEventsForResource(submitted.id);
    const approveLog = auditLogs.find((l) => l.eventName === 'DOCTOR_VERIFICATION_APPROVED');
    expect(approveLog).toBeDefined();
    expect(approveLog?.actorId).toBe(ADMIN_USER_ID);
  });

  it('should reject a pending submission with mandatory reason and preserve review history', async () => {
    const submitted = await setupSubmittedVerification();

    const rejected = await adminService.rejectVerification(submitted.id, ADMIN_USER_ID, {
      reason: 'License expired in 2025. Please provide renewed license certificate.',
      notes: 'Contacted council registry, found expired.',
    });

    expect(rejected.status).toBe(DoctorVerificationStatus.REJECTED);
    expect(rejected.rejectionReason).toContain('License expired');
    expect(rejected.reviewedBy).toBe(ADMIN_USER_ID);
    expect(rejected.reviews).toHaveLength(1);
    expect(rejected.reviews[0]?.action).toBe('REJECTED');
    expect(rejected.reviews[0]?.reason).toContain('License expired');

    // Verify DoctorProfile status updated to REJECTED
    const doctorProfile = await doctorsRepo.findByUserId(DOCTOR_USER_ID);
    expect(doctorProfile?.verificationStatus).toBe(VerificationStatus.REJECTED);
  });

  it('should fail rejection when rejection reason is missing or shorter than 5 characters', async () => {
    const submitted = await setupSubmittedVerification();

    await expect(
      adminService.rejectVerification(submitted.id, ADMIN_USER_ID, {
        reason: 'No',
      }),
    ).rejects.toThrow(ValidationError);
  });

  describe('Concurrency & State Protection Tests', () => {
    it('should throw ConflictError if trying to approve an already approved verification', async () => {
      const submitted = await setupSubmittedVerification();
      await adminService.approveVerification(submitted.id, ADMIN_USER_ID, {});

      // Concurrent/subsequent approval attempt
      await expect(
        adminService.approveVerification(submitted.id, 'adm-other-admin', {}),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if trying to reject an already approved verification', async () => {
      const submitted = await setupSubmittedVerification();
      await adminService.approveVerification(submitted.id, ADMIN_USER_ID, {});

      await expect(
        adminService.rejectVerification(submitted.id, 'adm-other-admin', {
          reason: 'Attempting conflicting rejection',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if trying to reject an already rejected verification', async () => {
      const submitted = await setupSubmittedVerification();
      await adminService.rejectVerification(submitted.id, ADMIN_USER_ID, {
        reason: 'License expired',
      });

      await expect(
        adminService.rejectVerification(submitted.id, 'adm-other-admin', {
          reason: 'Duplicate rejection',
        }),
      ).rejects.toThrow(ConflictError);
    });

    it('should throw ConflictError if trying to approve a draft submission not in PENDING_REVIEW', async () => {
      const draft = await doctorService.getDoctorVerification(DOCTOR_USER_ID);

      await expect(adminService.approveVerification(draft.id, ADMIN_USER_ID, {})).rejects.toThrow(
        ConflictError,
      );
    });
  });

  it('should allow reviewer to generate a secure document access URL', async () => {
    const submitted = await setupSubmittedVerification();
    const docId = submitted.documents[0]!.id;

    const access = await adminService.getAdminDocumentAccessUrl(submitted.id, docId, ADMIN_USER_ID);

    expect(access.documentId).toBe(docId);
    expect(access.accessUrl).toContain('vault.manvia.internal');
    expect(access.expiresInSeconds).toBe(600);
  });

  it('should throw NotFoundError for non-existent verification ID', async () => {
    await expect(adminService.getVerificationDetails('non-existent-id')).rejects.toThrow(
      NotFoundError,
    );
  });
});
