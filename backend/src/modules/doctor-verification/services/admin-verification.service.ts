import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError, ValidationError } from '../../../common/errors/app-error.js';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import {
  DOCTOR_VERIFICATION_REPOSITORY,
  type IDoctorVerificationRepository,
} from '../interfaces/verification-repository.interface.js';
import { STORAGE_SERVICE } from './storage.service.js';
import type { IStorageService } from '../../../common/interfaces/storage.interface.js';
import {
  VERIFICATION_AUDIT_SERVICE,
  type IVerificationAuditService,
} from '../interfaces/audit-service.interface.js';
import type { VerificationQueryDto } from '../dto/verification-query.dto.js';
import type { ApproveVerificationDto } from '../dto/approve-verification.dto.js';
import type { RejectVerificationDto } from '../dto/reject-verification.dto.js';
import type {
  AdminVerificationDetailResponseDto,
  AdminVerificationListResponseDto,
} from '../dto/admin-verification-response.dto.js';
import type { VerificationDocumentResponseDto } from '../dto/verification-document-response.dto.js';
import type { VerificationReviewResponseDto } from '../dto/verification-review-response.dto.js';
import type { DoctorVerificationEntity } from '../entities/doctor-verification.entity.js';
import type { VerificationDocumentEntity } from '../entities/verification-document.entity.js';
import type { VerificationReviewEntity } from '../entities/verification-review.entity.js';

@Injectable()
export class AdminVerificationService {
  constructor(
    @Inject(DOCTOR_VERIFICATION_REPOSITORY)
    private readonly verificationRepo: IDoctorVerificationRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(VERIFICATION_AUDIT_SERVICE)
    private readonly auditService: IVerificationAuditService,
  ) {}

  public async listVerifications(
    query: VerificationQueryDto,
  ): Promise<AdminVerificationListResponseDto> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const { verifications, total } = await this.verificationRepo.findVerifications({
      status: query.status,
      limit,
      offset,
    });

    return {
      items: verifications.map((v) => this.mapToAdminDetail(v)),
      total,
      limit,
      offset,
    };
  }

  public async getVerificationDetails(
    verificationId: string,
  ): Promise<AdminVerificationDetailResponseDto> {
    const verification = await this.verificationRepo.findById(verificationId);
    if (!verification) {
      throw new NotFoundError(`Doctor verification submission '${verificationId}' not found`);
    }

    return this.mapToAdminDetail(verification);
  }

  public async approveVerification(
    verificationId: string,
    adminId: string,
    dto: ApproveVerificationDto,
  ): Promise<AdminVerificationDetailResponseDto> {
    const existing = await this.verificationRepo.findById(verificationId);
    if (!existing) {
      throw new NotFoundError(`Doctor verification submission '${verificationId}' not found`);
    }

    // Concurrency / current-state checks
    if (existing.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictError('Verification submission has already been approved');
    }

    if (existing.status !== DoctorVerificationStatus.PENDING_REVIEW) {
      throw new ConflictError(
        `Cannot approve verification in '${existing.status}' status. Submissions must be in PENDING_REVIEW`,
      );
    }

    // Execute atomic transaction in repository
    const approved = await this.verificationRepo.approveVerification(
      verificationId,
      adminId,
      dto.notes,
    );

    await this.auditService.recordEvent({
      eventName: 'DOCTOR_VERIFICATION_APPROVED',
      actorId: adminId,
      actorRole: 'ADMIN',
      resourceId: approved.id,
      resourceType: 'DOCTOR_VERIFICATION',
      action: 'APPROVE',
      metadata: {
        doctorId: approved.doctorId,
        status: approved.status,
      },
      timestamp: new Date(),
    });

    return this.mapToAdminDetail(approved);
  }

  public async rejectVerification(
    verificationId: string,
    adminId: string,
    dto: RejectVerificationDto,
  ): Promise<AdminVerificationDetailResponseDto> {
    if (!dto.reason || dto.reason.trim().length < 5) {
      throw new ValidationError('A detailed rejection reason (at least 5 characters) is required');
    }

    const existing = await this.verificationRepo.findById(verificationId);
    if (!existing) {
      throw new NotFoundError(`Doctor verification submission '${verificationId}' not found`);
    }

    // Concurrency / current-state checks
    if (existing.status === DoctorVerificationStatus.APPROVED) {
      throw new ConflictError('Cannot reject an already approved doctor verification');
    }

    if (existing.status === DoctorVerificationStatus.REJECTED) {
      throw new ConflictError('Verification submission has already been rejected');
    }

    if (existing.status !== DoctorVerificationStatus.PENDING_REVIEW) {
      throw new ConflictError(
        `Cannot reject verification in '${existing.status}' status. Submissions must be in PENDING_REVIEW`,
      );
    }

    // Execute atomic transaction in repository
    const rejected = await this.verificationRepo.rejectVerification(
      verificationId,
      adminId,
      dto.reason.trim(),
      dto.notes,
    );

    await this.auditService.recordEvent({
      eventName: 'DOCTOR_VERIFICATION_REJECTED',
      actorId: adminId,
      actorRole: 'ADMIN',
      resourceId: rejected.id,
      resourceType: 'DOCTOR_VERIFICATION',
      action: 'REJECT',
      metadata: {
        doctorId: rejected.doctorId,
        status: rejected.status,
        reason: dto.reason.trim(),
      },
      timestamp: new Date(),
    });

    return this.mapToAdminDetail(rejected);
  }

  public async getAdminDocumentAccessUrl(
    verificationId: string,
    documentId: string,
    adminId: string,
  ): Promise<{ documentId: string; accessUrl: string; expiresInSeconds: number }> {
    const document = await this.verificationRepo.findDocumentById(documentId);
    if (!document || document.verificationId !== verificationId) {
      throw new NotFoundError(
        `Verification document '${documentId}' not found for verification '${verificationId}'`,
      );
    }

    const expiresInSeconds = 600;
    const accessUrl = await this.storageService.getSignedUrl(document.storageKey, expiresInSeconds);

    await this.auditService.recordEvent({
      eventName: 'DOCTOR_VERIFICATION_DOCUMENT_ACCESSED',
      actorId: adminId,
      actorRole: 'ADMIN',
      resourceId: document.id,
      resourceType: 'VERIFICATION_DOCUMENT',
      action: 'ADMIN_ACCESS_DOCUMENT',
      metadata: {
        verificationId,
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
    verificationId: string,
    documentId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; originalFileName: string }> {
    const document = await this.verificationRepo.findDocumentById(documentId);
    if (!document || document.verificationId !== verificationId) {
      throw new NotFoundError(
        `Verification document '${documentId}' not found for verification '${verificationId}'`,
      );
    }

    const buffer = await this.storageService.download(document.storageKey);
    return {
      buffer,
      mimeType: document.mimeType,
      originalFileName: document.originalFileName,
    };
  }

  private mapToAdminDetail(v: DoctorVerificationEntity): AdminVerificationDetailResponseDto {
    return {
      id: v.id,
      doctorId: v.doctorId,
      status: v.status,
      submissionNotes: v.submissionNotes,
      rejectionReason: v.rejectionReason,
      submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
      reviewedAt: v.reviewedAt ? v.reviewedAt.toISOString() : null,
      reviewedBy: v.reviewedBy,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      doctorProfile: v.doctorProfile
        ? {
            id: v.doctorProfile.id,
            userId: v.doctorProfile.userId,
            publicDoctorId: v.doctorProfile.publicDoctorId,
            displayName: v.doctorProfile.displayName,
            medicalRegistrationNumber: v.doctorProfile.medicalRegistrationNumber,
            licensingCouncil: v.doctorProfile.licensingCouncil,
            yearsOfExperience: v.doctorProfile.yearsOfExperience,
          }
        : undefined,
      documents: (v.documents ?? []).map((d) => this.mapDocumentToDto(d)),
      reviews: (v.reviews ?? []).map((r) => this.mapReviewToDto(r)),
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

  private mapReviewToDto(r: VerificationReviewEntity): VerificationReviewResponseDto {
    return {
      id: r.id,
      reviewerAdminId: r.reviewerAdminId,
      action: r.action,
      reason: r.reason,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    };
  }
}
