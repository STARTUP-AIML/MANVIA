import { Inject, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/app-error.js';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';
import {
  DOCTOR_VERIFICATION_REPOSITORY,
  type IDoctorVerificationRepository,
} from '../interfaces/verification-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { STORAGE_SERVICE } from './storage.service.js';
import type { IStorageService } from '../../../common/interfaces/storage.interface.js';
import {
  VERIFICATION_AUDIT_SERVICE,
  type IVerificationAuditService,
} from '../interfaces/audit-service.interface.js';
import type { SubmitVerificationDto } from '../dto/submit-verification.dto.js';
import type { UploadVerificationDocumentDto } from '../dto/upload-verification-document.dto.js';
import type { DoctorVerificationResponseDto } from '../dto/doctor-verification-response.dto.js';
import type { VerificationDocumentResponseDto } from '../dto/verification-document-response.dto.js';
import type { DoctorVerificationEntity } from '../entities/doctor-verification.entity.js';
import type { VerificationDocumentEntity } from '../entities/verification-document.entity.js';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  if (mimeType === 'application/pdf') {
    const head = buffer.subarray(0, 4).toString('ascii');
    return head === '%PDF' || head.startsWith('PDF');
  }
  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return true;
}

@Injectable()
export class DoctorVerificationService {
  constructor(
    @Inject(DOCTOR_VERIFICATION_REPOSITORY)
    private readonly verificationRepo: IDoctorVerificationRepository,
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepo: IDoctorsRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(VERIFICATION_AUDIT_SERVICE)
    private readonly auditService: IVerificationAuditService,
  ) {}

  public async getDoctorVerification(userId: string): Promise<DoctorVerificationResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    let verification = await this.verificationRepo.findActiveByDoctorId(doctor.id);
    if (!verification) {
      // Initialize draft workflow
      verification = await this.verificationRepo.createDraft(doctor.id);
    }

    return this.mapToDoctorResponse(verification);
  }

  public async createOrUpdateDraft(
    userId: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot modify verification drafts');
    }

    const current = await this.verificationRepo.findActiveByDoctorId(doctor.id);

    if (!current) {
      const created = await this.verificationRepo.createDraft(doctor.id, notes);
      return this.mapToDoctorResponse(created);
    }

    if (current.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictError('Doctor verification has already been approved');
    }

    if (current.status === DoctorVerificationStatus.PENDING_REVIEW) {
      throw new ConflictError(
        'Verification submission is currently under review and cannot be modified',
      );
    }

    if (current.status === DoctorVerificationStatus.REJECTED) {
      // Re-submission lifecycle: create a new DRAFT submission preserving the rejected history
      const newDraft = await this.verificationRepo.createDraft(doctor.id, notes);
      return this.mapToDoctorResponse(newDraft);
    }

    const updated = await this.verificationRepo.updateDraft(current.id, notes);
    return this.mapToDoctorResponse(updated);
  }

  public async uploadDocument(
    userId: string,
    dto: UploadVerificationDocumentDto,
  ): Promise<VerificationDocumentResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot upload verification documents');
    }

    if (!ALLOWED_MIME_TYPES.has(dto.mimeType)) {
      throw new ValidationError(
        'Invalid document MIME type. Supported types: application/pdf, image/jpeg, image/png, image/webp',
      );
    }

    let verification = await this.verificationRepo.findActiveByDoctorId(doctor.id);
    if (!verification) {
      verification = await this.verificationRepo.createDraft(doctor.id);
    }

    if (verification.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictError('Cannot attach documents to an already approved verification');
    }

    if (verification.status === DoctorVerificationStatus.PENDING_REVIEW) {
      throw new ConflictError(
        'Cannot attach documents while verification is under administrative review',
      );
    }

    if (verification.status === DoctorVerificationStatus.REJECTED) {
      // If previous was rejected, create a new draft for resubmission
      verification = await this.verificationRepo.createDraft(doctor.id);
    }

    // Prepare storage payload
    const safeFileName = dto.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `verifications/${doctor.id}/${crypto.randomUUID()}-${safeFileName}`;

    const buffer = dto.contentBase64
      ? Buffer.from(dto.contentBase64, 'base64')
      : Buffer.from(`verification-doc-${Date.now()}`);

    if (buffer.length > 10 * 1024 * 1024) {
      throw new ValidationError('File size exceeds the 10MB limit');
    }

    if (dto.contentBase64 && !validateMagicBytes(buffer, dto.mimeType)) {
      throw new ValidationError('Document content does not match the specified MIME type');
    }

    await this.storageService.upload({
      key: storageKey,
      buffer,
      mimeType: dto.mimeType,
      metadata: {
        doctorId: doctor.id,
        verificationId: verification.id,
        documentType: dto.documentType,
      },
    });

    const docEntity = await this.verificationRepo.addDocument(verification.id, {
      documentType: dto.documentType,
      storageKey,
      originalFileName: dto.originalFileName,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
    });

    await this.auditService.recordEvent({
      eventName: 'DOCTOR_VERIFICATION_DOCUMENT_UPLOADED',
      actorId: userId,
      actorRole: 'DOCTOR',
      resourceId: docEntity.id,
      resourceType: 'VERIFICATION_DOCUMENT',
      action: 'UPLOAD_DOCUMENT',
      metadata: {
        verificationId: verification.id,
        documentType: dto.documentType,
        fileSizeBytes: dto.fileSizeBytes,
      },
      timestamp: new Date(),
    });

    return this.mapDocumentToDto(docEntity);
  }

  public async submitVerification(
    userId: string,
    dto: SubmitVerificationDto,
  ): Promise<DoctorVerificationResponseDto> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    if (doctor.verificationStatus === VerificationStatus.SUSPENDED) {
      throw new ForbiddenError('Suspended physicians cannot submit verification');
    }

    let verification = await this.verificationRepo.findActiveByDoctorId(doctor.id);
    if (!verification) {
      verification = await this.verificationRepo.createDraft(doctor.id);
    }

    if (verification.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictError('Doctor verification has already been approved');
    }

    if (verification.status === DoctorVerificationStatus.PENDING_REVIEW) {
      throw new ConflictError('Verification submission is already pending administrative review');
    }

    // Professional profile integrity checks
    if (!doctor.medicalRegistrationNumber || doctor.medicalRegistrationNumber.trim().length === 0) {
      throw new ValidationError(
        'Medical registration number is required prior to verification submission',
      );
    }

    if (!doctor.licensingCouncil || doctor.licensingCouncil.trim().length === 0) {
      throw new ValidationError('Licensing council is required prior to verification submission');
    }

    // Document requirement: at least 1 document must be attached
    const documents = await this.verificationRepo.findDocumentsByVerificationId(verification.id);
    if (documents.length === 0) {
      throw new ValidationError(
        'At least one verification document (such as medical license) is required before submission',
      );
    }

    const submitted = await this.verificationRepo.submitForReview(verification.id, dto.notes);

    await this.auditService.recordEvent({
      eventName: 'DOCTOR_VERIFICATION_SUBMITTED',
      actorId: userId,
      actorRole: 'DOCTOR',
      resourceId: submitted.id,
      resourceType: 'DOCTOR_VERIFICATION',
      action: 'SUBMIT_FOR_REVIEW',
      metadata: {
        doctorId: doctor.id,
        documentsCount: documents.length,
      },
      timestamp: new Date(),
    });

    return this.mapToDoctorResponse(submitted);
  }

  public async getDocumentAccessUrl(
    userId: string,
    documentId: string,
  ): Promise<{ documentId: string; accessUrl: string; expiresInSeconds: number }> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const document = await this.verificationRepo.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Verification document not found');
    }

    const verification = await this.verificationRepo.findById(document.verificationId);
    if (!verification) {
      throw new NotFoundError('Associated verification submission not found');
    }

    // Resource-level authorization: ensure this document belongs to this physician
    if (verification.doctorId !== doctor.id) {
      throw new ForbiddenError('Access to this verification document is denied');
    }

    const expiresInSeconds = 300;
    const accessUrl = await this.storageService.getSignedUrl(document.storageKey, expiresInSeconds);

    await this.auditService.recordEvent({
      eventName: 'DOCTOR_VERIFICATION_DOCUMENT_ACCESSED',
      actorId: userId,
      actorRole: 'DOCTOR',
      resourceId: document.id,
      resourceType: 'VERIFICATION_DOCUMENT',
      action: 'GENERATE_ACCESS_URL',
      metadata: {
        documentType: document.documentType,
      },
      timestamp: new Date(),
    });

    return {
      documentId: document.id,
      accessUrl,
      expiresInSeconds,
    };
  }

  public async downloadDocument(
    userId: string,
    documentId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; originalFileName: string }> {
    const doctor = await this.doctorsRepo.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundError('Doctor profile not found for authenticated user');
    }

    const document = await this.verificationRepo.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundError('Verification document not found');
    }

    const verification = await this.verificationRepo.findById(document.verificationId);
    if (!verification) {
      throw new NotFoundError('Associated verification submission not found');
    }

    if (verification.doctorId !== doctor.id) {
      throw new ForbiddenError('Access to this verification document is denied');
    }

    const buffer = await this.storageService.download(document.storageKey);
    return {
      buffer,
      mimeType: document.mimeType,
      originalFileName: document.originalFileName,
    };
  }

  private mapToDoctorResponse(v: DoctorVerificationEntity): DoctorVerificationResponseDto {
    return {
      id: v.id,
      status: v.status,
      submissionNotes: v.submissionNotes,
      rejectionReason: v.rejectionReason,
      submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
      reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      documents: (v.documents ?? []).map((d) => this.mapDocumentToDto(d)),
    };
  }

  private mapDocumentToDto(d: VerificationDocumentEntity): VerificationDocumentResponseDto {
    return {
      id: d.id,
      documentType: d.documentType,
      originalFileName: d.originalFileName,
      mimeType: d.mimeType,
      fileSizeBytes: d.fileSizeBytes,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    };
  }
}
