import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { InMemoryDoctorVerificationRepository } from '../../src/modules/doctor-verification/repositories/in-memory-verification.repository.js';
import { PrismaDoctorVerificationRepository } from '../../src/modules/doctor-verification/repositories/prisma-verification.repository.js';
import { DoctorVerificationStatus } from '../../src/modules/doctor-verification/enums/doctor-verification-status.enum.js';
import { VerificationDocumentType } from '../../src/modules/doctor-verification/enums/verification-document-type.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConflictError } from '../../src/common/errors/app-error.js';

describe('Doctor Verification Integration Tests', () => {
  let doctorsRepo: InMemoryDoctorsRepository;
  let verificationRepo: InMemoryDoctorVerificationRepository;

  const DOCTOR_ID = 'doc-integ-111';
  const USER_ID = 'usr-integ-111';

  beforeEach(async () => {
    doctorsRepo = new InMemoryDoctorsRepository();
    verificationRepo = new InMemoryDoctorVerificationRepository(doctorsRepo);

    await doctorsRepo.createProfile({
      userId: USER_ID,
      publicDoctorId: 'DOC-INT01',
      displayName: 'Dr. Leonard McCoy',
      medicalRegistrationNumber: 'MED-STAR-701',
      licensingCouncil: 'Starfleet Medical Council',
      yearsOfExperience: 15,
    });
  });

  it('should persist a verification draft and transition through the lifecycle', async () => {
    const doctor = await doctorsRepo.findByUserId(USER_ID);
    expect(doctor).toBeDefined();

    // 1. Create draft
    const draft = await verificationRepo.createDraft(doctor!.id, 'Initial verification draft');
    expect(draft.id).toBeDefined();
    expect(draft.status).toBe(DoctorVerificationStatus.DRAFT);
    expect(draft.submissionNotes).toBe('Initial verification draft');

    // 2. Add verification document
    const doc = await verificationRepo.addDocument(draft.id, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      storageKey: `verifications/${doctor!.id}/license.pdf`,
      originalFileName: 'license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 51200,
    });
    expect(doc.id).toBeDefined();
    expect(doc.verificationId).toBe(draft.id);

    // 3. Prevent duplicate storageKey insertion
    await expect(
      verificationRepo.addDocument(draft.id, {
        documentType: VerificationDocumentType.DEGREE_CERTIFICATE,
        storageKey: `verifications/${doctor!.id}/license.pdf`, // duplicate key
        originalFileName: 'license_duplicate.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 51200,
      }),
    ).rejects.toThrow(ConflictError);

    // 4. Submit for review
    const submitted = await verificationRepo.submitForReview(draft.id, 'Ready for board review');
    expect(submitted.status).toBe(DoctorVerificationStatus.PENDING_REVIEW);
    expect(submitted.submittedAt).toBeInstanceOf(Date);

    // Doctor profile status should be updated to SUBMITTED
    const profileAfterSubmit = await doctorsRepo.findById(doctor!.id);
    expect(profileAfterSubmit?.verificationStatus).toBe(VerificationStatus.SUBMITTED);

    // 5. Approve verification
    const approved = await verificationRepo.approveVerification(
      draft.id,
      'admin-supreme',
      'Credentials validated directly with Starfleet Medical Registry',
    );
    expect(approved.status).toBe(DoctorVerificationStatus.APPROVED);
    expect(approved.reviewedBy).toBe('admin-supreme');

    // Doctor profile should be VERIFIED with verifiedAt set
    const profileAfterApprove = await doctorsRepo.findById(doctor!.id);
    expect(profileAfterApprove?.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(profileAfterApprove?.verifiedAt).toBeInstanceOf(Date);

    // 6. Review history audit trail
    const reviews = await verificationRepo.getReviewHistory(draft.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.reviewerAdminId).toBe('admin-supreme');
    expect(reviews[0]?.action).toBe('APPROVED');
  });

  it('should preserve rejection history when rejected by administrator', async () => {
    const doctor = await doctorsRepo.findByUserId(USER_ID);
    const draft = await verificationRepo.createDraft(doctor!.id);
    await verificationRepo.submitForReview(draft.id);

    const rejected = await verificationRepo.rejectVerification(
      draft.id,
      'admin-auditor-1',
      'Medical license has expired. Renewal receipt required.',
      'Auditor note: Expiry verified on 2026-09-29',
    );

    expect(rejected.status).toBe(DoctorVerificationStatus.REJECTED);
    expect(rejected.rejectionReason).toContain('Medical license has expired');
    expect(rejected.reviewedBy).toBe('admin-auditor-1');

    const history = await verificationRepo.getReviewHistory(draft.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe('REJECTED');
    expect(history[0]?.reason).toContain('Medical license has expired');

    // DoctorProfile verificationStatus should be REJECTED
    const profile = await doctorsRepo.findById(doctor!.id);
    expect(profile?.verificationStatus).toBe(VerificationStatus.REJECTED);
  });

  describe('PrismaDoctorVerificationRepository contract verification', () => {
    it('should throw Error when PrismaClient is not injected in Prisma repository', async () => {
      const repo = new PrismaDoctorVerificationRepository();

      await expect(repo.findById('any-id')).rejects.toThrow('PrismaClient is not initialized');
    });

    it('should execute properly when mock Prisma client delegate is supplied', async () => {
      const mockPrisma = {
        doctorVerification: {
          findUnique: async () => ({
            id: 'v-mock-1',
            doctorId: DOCTOR_ID,
            status: 'PENDING_REVIEW',
            submissionNotes: 'Notes',
            rejectionReason: null,
            submittedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            documents: [],
            reviews: [],
          }),
        },
        verificationDocument: {},
        verificationReview: {},
        doctorProfile: {},
        $transaction: async <R>(fn: (tx: unknown) => Promise<R>) => fn(mockPrisma),
      };

      const repo = new PrismaDoctorVerificationRepository(mockPrisma as never);
      const res = await repo.findById('v-mock-1');

      expect(res).toBeDefined();
      expect(res?.id).toBe('v-mock-1');
      expect(res?.status).toBe(DoctorVerificationStatus.PENDING_REVIEW);
    });
  });
});
