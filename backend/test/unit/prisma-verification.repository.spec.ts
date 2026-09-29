import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaDoctorVerificationRepository } from '../../src/modules/doctor-verification/repositories/prisma-verification.repository.js';
import { DoctorVerificationStatus } from '../../src/modules/doctor-verification/enums/doctor-verification-status.enum.js';
import { VerificationDocumentType } from '../../src/modules/doctor-verification/enums/verification-document-type.enum.js';
import { ConflictError, NotFoundError } from '../../src/common/errors/app-error.js';

interface MockDelegate {
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
}

interface MockPrisma {
  doctorVerification: MockDelegate;
  verificationDocument: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  verificationReview: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  doctorProfile: {
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
}

describe('PrismaDoctorVerificationRepository', () => {
  let repository: PrismaDoctorVerificationRepository;
  let mockPrisma: MockPrisma;

  const mockRawVerification = {
    id: 'verif-1',
    doctorId: 'doc-1',
    status: 'DRAFT',
    submissionNotes: 'Initial submission',
    rejectionReason: null,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    doctor: {
      id: 'doc-1',
      displayName: 'Dr. McCoy',
      medicalRegistrationNumber: 'MED-123',
      licensingCouncil: 'Council',
      verificationStatus: 'DRAFT',
    },
    documents: [],
    reviews: [],
  };

  const mockRawDoc = {
    id: 'doc-item-1',
    verificationId: 'verif-1',
    documentType: 'MEDICAL_LICENSE',
    storageKey: 'verif/doc1/lic.pdf',
    originalFileName: 'lic.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 1024,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      doctorVerification: {
        findFirst: vi.fn().mockResolvedValue(mockRawVerification),
        findUnique: vi.fn().mockResolvedValue(mockRawVerification),
        create: vi.fn().mockResolvedValue(mockRawVerification),
        update: vi.fn().mockResolvedValue(mockRawVerification),
        findMany: vi.fn().mockResolvedValue([mockRawVerification]),
        count: vi.fn().mockResolvedValue(1),
      },
      verificationDocument: {
        create: vi.fn().mockResolvedValue(mockRawDoc),
        findUnique: vi.fn().mockResolvedValue(mockRawDoc),
        findMany: vi.fn().mockResolvedValue([mockRawDoc]),
      },
      verificationReview: {
        create: vi.fn().mockResolvedValue({
          id: 'rev-1',
          verificationId: 'verif-1',
          reviewerAdminId: 'admin-1',
          action: 'APPROVED',
          reason: null,
          notes: 'Looks good',
          createdAt: new Date(),
        }),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rev-1',
            verificationId: 'verif-1',
            reviewerAdminId: 'admin-1',
            action: 'APPROVED',
            reason: null,
            notes: 'Looks good',
            createdAt: new Date(),
          },
        ]),
      },
      doctorProfile: {
        update: vi.fn().mockResolvedValue({ id: 'doc-1' }),
      },
      $transaction: vi
        .fn()
        .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma)),
    };

    repository = new PrismaDoctorVerificationRepository(mockPrisma as never);
  });

  it('should find active verification by doctorId', async () => {
    const res = await repository.findActiveByDoctorId('doc-1');
    expect(res?.id).toBe('verif-1');

    vi.spyOn(mockPrisma.doctorVerification, 'findFirst').mockResolvedValue(null);
    expect(await repository.findActiveByDoctorId('doc-none')).toBeNull();
  });

  it('should find verification by id', async () => {
    const res = await repository.findById('verif-1');
    expect(res?.id).toBe('verif-1');

    vi.spyOn(mockPrisma.doctorVerification, 'findUnique').mockResolvedValue(null);
    expect(await repository.findById('verif-none')).toBeNull();
  });

  it('should create draft verification', async () => {
    const res = await repository.createDraft('doc-1', 'Initial notes');
    expect(res.id).toBe('verif-1');
    expect(mockPrisma.doctorVerification.create).toHaveBeenCalled();
  });

  it('should update draft verification', async () => {
    const res = await repository.updateDraft('verif-1', 'Updated notes');
    expect(res.id).toBe('verif-1');
    expect(mockPrisma.doctorVerification.update).toHaveBeenCalled();
  });

  it('should submit verification for review in transaction', async () => {
    const res = await repository.submitForReview('verif-1', 'Submitting for review');
    expect(res.id).toBe('verif-1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should add document and map to entity', async () => {
    const res = await repository.addDocument('verif-1', {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      storageKey: 'verif/doc1/lic.pdf',
      originalFileName: 'lic.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024,
    });
    expect(res.id).toBe('doc-item-1');
  });

  it('should throw ConflictError on unique constraint failure when adding document', async () => {
    vi.spyOn(mockPrisma.verificationDocument, 'create').mockRejectedValue(
      new Error('Unique constraint failed on storageKey'),
    );

    await expect(
      repository.addDocument('verif-1', {
        documentType: VerificationDocumentType.MEDICAL_LICENSE,
        storageKey: 'verif/doc1/lic.pdf',
        originalFileName: 'lic.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
      }),
    ).rejects.toThrow(new ConflictError('A document with this storage key already exists'));
  });

  it('should find document by id and documents by verification id', async () => {
    const doc = await repository.findDocumentById('doc-item-1');
    expect(doc?.id).toBe('doc-item-1');

    vi.spyOn(mockPrisma.verificationDocument, 'findUnique').mockResolvedValue(null);
    expect(await repository.findDocumentById('none')).toBeNull();

    const list = await repository.findDocumentsByVerificationId('verif-1');
    expect(list).toHaveLength(1);
  });

  it('should find verifications with criteria', async () => {
    const res = await repository.findVerifications({
      status: DoctorVerificationStatus.DRAFT,
      offset: 0,
      limit: 10,
    });
    expect(res.verifications).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it('should approve verification in transaction', async () => {
    const res = await repository.approveVerification('verif-1', 'admin-1', 'Approved credentials');
    expect(res.id).toBe('verif-1');
    expect(mockPrisma.verificationReview.create).toHaveBeenCalled();
  });

  it('should throw NotFoundError if record not found after approval', async () => {
    vi.spyOn(mockPrisma.doctorVerification, 'findUnique').mockResolvedValue(null);

    await expect(
      repository.approveVerification('verif-1', 'admin-1', 'Approved credentials'),
    ).rejects.toThrow(new NotFoundError('Verification record not found after approval'));
  });

  it('should reject verification in transaction', async () => {
    const res = await repository.rejectVerification(
      'verif-1',
      'admin-1',
      'Invalid document',
      'Notes',
    );
    expect(res.id).toBe('verif-1');
    expect(mockPrisma.verificationReview.create).toHaveBeenCalled();
  });

  it('should throw NotFoundError if record not found after rejection', async () => {
    vi.spyOn(mockPrisma.doctorVerification, 'findUnique').mockResolvedValue(null);

    await expect(
      repository.rejectVerification('verif-1', 'admin-1', 'Invalid document', 'Notes'),
    ).rejects.toThrow(new NotFoundError('Verification record not found after rejection'));
  });

  it('should get review history', async () => {
    const history = await repository.getReviewHistory('verif-1');
    expect(history).toHaveLength(1);
    expect(history[0]?.reviewerAdminId).toBe('admin-1');
  });
});
