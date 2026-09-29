import { describe, it, expect, beforeEach } from 'vitest';
import { DoctorVerificationService } from '../../src/modules/doctor-verification/services/doctor-verification.service.js';
import { InMemoryDoctorVerificationRepository } from '../../src/modules/doctor-verification/repositories/in-memory-verification.repository.js';
import { InMemoryDoctorsRepository } from '../../src/modules/doctors/repositories/in-memory-doctors.repository.js';
import { StorageService } from '../../src/modules/doctor-verification/services/storage.service.js';
import { VerificationAuditService } from '../../src/modules/doctor-verification/services/verification-audit.service.js';
import { DoctorVerificationStatus } from '../../src/modules/doctor-verification/enums/doctor-verification-status.enum.js';
import { VerificationDocumentType } from '../../src/modules/doctor-verification/enums/verification-document-type.enum.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../src/common/errors/app-error.js';

describe('DoctorVerificationService (Unit Tests)', () => {
  let service: DoctorVerificationService;
  let verificationRepo: InMemoryDoctorVerificationRepository;
  let doctorsRepo: InMemoryDoctorsRepository;
  let storageService: StorageService;
  let auditService: VerificationAuditService;

  const DOCTOR_USER_ID = 'usr-doctor-001';
  const OTHER_DOCTOR_USER_ID = 'usr-doctor-002';

  beforeEach(async () => {
    doctorsRepo = new InMemoryDoctorsRepository();
    verificationRepo = new InMemoryDoctorVerificationRepository(doctorsRepo);
    storageService = new StorageService();
    auditService = new VerificationAuditService();

    service = new DoctorVerificationService(
      verificationRepo,
      doctorsRepo,
      storageService,
      auditService,
    );

    // Create doctor profiles
    await doctorsRepo.createProfile({
      userId: DOCTOR_USER_ID,
      publicDoctorId: 'DOC-TEST01',
      displayName: 'Dr. Sarah Connor',
      medicalRegistrationNumber: 'MED-REG-1001',
      licensingCouncil: 'California Medical Board',
      yearsOfExperience: 10,
    });

    await doctorsRepo.createProfile({
      userId: OTHER_DOCTOR_USER_ID,
      publicDoctorId: 'DOC-TEST02',
      displayName: 'Dr. John Connor',
      medicalRegistrationNumber: 'MED-REG-1002',
      licensingCouncil: 'Nevada Medical Board',
      yearsOfExperience: 5,
    });
  });

  it('should initialize and return a draft verification when doctor requests verification details', async () => {
    const res = await service.getDoctorVerification(DOCTOR_USER_ID);

    expect(res).toBeDefined();
    expect(res.status).toBe(DoctorVerificationStatus.DRAFT);
    expect(res.documents).toHaveLength(0);
    expect(res.submittedAt).toBeNull();
  });

  it('should update draft submission notes successfully', async () => {
    const res = await service.createOrUpdateDraft(DOCTOR_USER_ID, 'Attached initial license copy');

    expect(res.status).toBe(DoctorVerificationStatus.DRAFT);
    expect(res.submissionNotes).toBe('Attached initial license copy');
  });

  it('should allow uploading a valid credential document and store it securely', async () => {
    const docRes = await service.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'california_board_license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 204800,
      contentBase64: Buffer.from('PDF-MOCK-CONTENT').toString('base64'),
    });

    expect(docRes).toBeDefined();
    expect(docRes.id).toBeDefined();
    expect(docRes.documentType).toBe(VerificationDocumentType.MEDICAL_LICENSE);
    expect(docRes.originalFileName).toBe('california_board_license.pdf');

    // Verification draft should now have 1 document attached
    const ver = await service.getDoctorVerification(DOCTOR_USER_ID);
    expect(ver.documents).toHaveLength(1);
    expect(ver.documents[0]?.id).toBe(docRes.id);
  });

  it('should reject submission if no verification documents have been attached', async () => {
    await expect(
      service.submitVerification(DOCTOR_USER_ID, { notes: 'Ready for review' }),
    ).rejects.toThrow(ValidationError);
  });

  it('should successfully submit verification for review when credentials and documents are present', async () => {
    // 1. Upload required document
    await service.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'board_license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 102400,
    });

    // 2. Submit for review
    const submitted = await service.submitVerification(DOCTOR_USER_ID, {
      notes: 'Please verify my credentials',
    });

    expect(submitted.status).toBe(DoctorVerificationStatus.PENDING_REVIEW);
    expect(submitted.submittedAt).not.toBeNull();
    expect(submitted.submissionNotes).toBe('Please verify my credentials');
  });

  it('should throw ConflictError if attempting to submit an already pending review', async () => {
    await service.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 102400,
    });

    await service.submitVerification(DOCTOR_USER_ID, {});

    // Duplicate submission attempt
    await expect(service.submitVerification(DOCTOR_USER_ID, {})).rejects.toThrow(ConflictError);
  });

  it('should prevent modifying draft or uploading documents once in PENDING_REVIEW', async () => {
    await service.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 102400,
    });

    await service.submitVerification(DOCTOR_USER_ID, {});

    await expect(service.createOrUpdateDraft(DOCTOR_USER_ID, 'Trying to edit')).rejects.toThrow(
      ConflictError,
    );

    await expect(
      service.uploadDocument(DOCTOR_USER_ID, {
        documentType: VerificationDocumentType.DEGREE_CERTIFICATE,
        originalFileName: 'degree.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 50000,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should allow doctor to generate access URL for their own document', async () => {
    const doc = await service.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 102400,
    });

    const access = await service.getDocumentAccessUrl(DOCTOR_USER_ID, doc.id);
    expect(access.documentId).toBe(doc.id);
    expect(access.accessUrl).toContain('vault.manvia.internal');
    expect(access.expiresInSeconds).toBe(300);
  });

  it('SECURITY: should reject access when Doctor A attempts to access Doctor B document', async () => {
    // Doctor A uploads document
    const docA = await service.uploadDocument(DOCTOR_USER_ID, {
      documentType: VerificationDocumentType.MEDICAL_LICENSE,
      originalFileName: 'doctorA_license.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 102400,
    });

    // Doctor B attempts to access Doctor A's document
    await expect(service.getDocumentAccessUrl(OTHER_DOCTOR_USER_ID, docA.id)).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('should throw NotFoundError if doctor profile does not exist', async () => {
    await expect(service.getDoctorVerification('usr-non-existent')).rejects.toThrow(NotFoundError);
  });
});
