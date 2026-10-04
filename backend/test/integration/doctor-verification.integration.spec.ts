import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { PrismaDoctorsRepository } from '../../src/modules/doctors/repositories/prisma-doctors.repository.js';
import { PrismaDoctorVerificationRepository } from '../../src/modules/doctor-verification/repositories/prisma-verification.repository.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { ConfigService } from '../../src/config/config.service.js';
import { seedTaxonomies } from '../../src/database/seeds/taxonomy.seed.js';
import { DoctorVerificationStatus } from '../../src/modules/doctor-verification/enums/doctor-verification-status.enum.js';
import { VerificationDocumentType } from '../../src/modules/doctor-verification/enums/verification-document-type.enum.js';
import { VerificationStatus } from '../../src/modules/doctors/enums/verification-status.enum.js';
import { ConflictError } from '../../src/common/errors/app-error.js';

describe('Doctor Verification Integration Tests with PostgreSQL', () => {
  let prismaService: PrismaService;
  let doctorsRepo: PrismaDoctorsRepository;
  let verificationRepo: PrismaDoctorVerificationRepository;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    const configService = new ConfigService();
    prismaService = new PrismaService(configService);
    await prismaService.onModuleInit();

    await seedTaxonomies(prismaService);

    doctorsRepo = new PrismaDoctorsRepository(prismaService);
    verificationRepo = new PrismaDoctorVerificationRepository(prismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prismaService.verificationReview.deleteMany({});
      await prismaService.verificationDocument.deleteMany({});
      await prismaService.doctorVerification.deleteMany({});
      await prismaService.doctorProfile.deleteMany({
        where: { userId: { in: createdUserIds } },
      });
      await prismaService.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    await prismaService.onApplicationShutdown();
  });

  async function createTestDoctor(): Promise<{ userId: string; doctorId: string }> {
    const user = await prismaService.user.create({
      data: {
        email: `doc-verif-${crypto.randomUUID()}@example.com`,
        roles: ['DOCTOR'],
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(user.id);

    const doctor = await doctorsRepo.createProfile({
      userId: user.id,
      publicDoctorId: `DOC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      displayName: 'Dr. Leonard McCoy',
      medicalRegistrationNumber: `MED-REG-${crypto.randomUUID().substring(0, 8)}`,
      licensingCouncil: 'Starfleet Medical Council',
      yearsOfExperience: 15,
    });

    return { userId: user.id, doctorId: doctor.id };
  }

  it('should persist a verification draft and transition through the lifecycle in PostgreSQL', async () => {
    const { doctorId } = await createTestDoctor();

    // 1. Create draft
    const draft = await verificationRepo.createDraft(doctorId, 'Initial verification draft');
    expect(draft.id).toBeDefined();
    expect(draft.status).toBe(DoctorVerificationStatus.DRAFT);
    expect(draft.submissionNotes).toBe('Initial verification draft');

    // 2. Add verification document
    const doc = await verificationRepo.addDocument(draft.id, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      storageKey: `verifications/${doctorId}/${crypto.randomUUID()}-license.pdf`,
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
        storageKey: doc.storageKey, // duplicate key
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
    const profileAfterSubmit = await doctorsRepo.findById(doctorId);
    expect(profileAfterSubmit?.verificationStatus).toBe(VerificationStatus.SUBMITTED);

    // 5. Approve verification
    const adminUser = await prismaService.user.create({
      data: {
        email: `admin-appr-${crypto.randomUUID()}@example.com`,
        roles: ['ADMIN'],
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(adminUser.id);

    const approved = await verificationRepo.approveVerification(
      draft.id,
      adminUser.id,
      'Credentials validated directly with Starfleet Medical Registry',
    );
    expect(approved.status).toBe(DoctorVerificationStatus.APPROVED);
    expect(approved.reviewedBy).toBe(adminUser.id);

    // Doctor profile should be VERIFIED with verifiedAt set
    const profileAfterApprove = await doctorsRepo.findById(doctorId);
    expect(profileAfterApprove?.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(profileAfterApprove?.verifiedAt).toBeInstanceOf(Date);

    // 6. Review history audit trail persisted in PostgreSQL
    const reviews = await verificationRepo.getReviewHistory(draft.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0]?.reviewerAdminId).toBe(adminUser.id);
    expect(reviews[0]?.action).toBe('APPROVED');
  });

  it('should preserve rejection history when rejected by administrator in PostgreSQL', async () => {
    const { doctorId } = await createTestDoctor();
    const draft = await verificationRepo.createDraft(doctorId);
    await verificationRepo.submitForReview(draft.id);

    const adminUser = await prismaService.user.create({
      data: {
        email: `admin-rej-${crypto.randomUUID()}@example.com`,
        roles: ['ADMIN'],
        status: 'ACTIVE',
      },
    });
    createdUserIds.push(adminUser.id);

    const rejected = await verificationRepo.rejectVerification(
      draft.id,
      adminUser.id,
      'Medical license has expired. Renewal receipt required.',
      'Auditor note: Expiry verified on 2026-09-29',
    );

    expect(rejected.status).toBe(DoctorVerificationStatus.REJECTED);
    expect(rejected.rejectionReason).toContain('Medical license has expired');
    expect(rejected.reviewedBy).toBe(adminUser.id);

    const history = await verificationRepo.getReviewHistory(draft.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.action).toBe('REJECTED');
    expect(history[0]?.reason).toContain('Medical license has expired');

    // DoctorProfile verificationStatus should be REJECTED
    const profile = await doctorsRepo.findById(doctorId);
    expect(profile?.verificationStatus).toBe(VerificationStatus.REJECTED);
  });

  describe('PrismaDoctorVerificationRepository contract verification', () => {
    it('should throw Error when PrismaClient is not injected in Prisma repository', async () => {
      const repo = new PrismaDoctorVerificationRepository();

      await expect(repo.findById('any-id')).rejects.toThrow('PrismaClient is not initialized');
    });
  });
});
