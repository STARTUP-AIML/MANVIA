import { Inject, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { ConflictError, NotFoundError } from '../../../common/errors/app-error.js';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import { DocumentStatus } from '../enums/document-status.enum.js';
import { ReviewAction } from '../enums/review-action.enum.js';
import type { DoctorVerificationEntity } from '../entities/doctor-verification.entity.js';
import type { VerificationDocumentEntity } from '../entities/verification-document.entity.js';
import type { VerificationReviewEntity } from '../entities/verification-review.entity.js';
import type {
  CreateDocumentData,
  IDoctorVerificationRepository,
  VerificationFilterCriteria,
} from '../interfaces/verification-repository.interface.js';
import {
  DOCTORS_REPOSITORY,
  type IDoctorsRepository,
} from '../../doctors/interfaces/doctor-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';

@Injectable()
export class InMemoryDoctorVerificationRepository implements IDoctorVerificationRepository {
  private readonly verifications = new Map<string, DoctorVerificationEntity>();
  private readonly documents = new Map<string, VerificationDocumentEntity>();
  private readonly reviews = new Map<string, VerificationReviewEntity[]>();

  constructor(
    @Inject(DOCTORS_REPOSITORY)
    private readonly doctorsRepository: IDoctorsRepository,
  ) {}

  public async findActiveByDoctorId(doctorId: string): Promise<DoctorVerificationEntity | null> {
    const doctorVerifications: DoctorVerificationEntity[] = [];
    for (const v of this.verifications.values()) {
      if (v.doctorId === doctorId) {
        doctorVerifications.push(this.hydrateVerification(v));
      }
    }

    if (doctorVerifications.length === 0) {
      return null;
    }

    // Sort by createdAt descending to return the most recent active/lifecycle submission
    doctorVerifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const latest = doctorVerifications[0];
    if (latest) {
      await this.populateDoctorProfile(latest);
      return latest;
    }
    return null;
  }

  public async findById(id: string): Promise<DoctorVerificationEntity | null> {
    const raw = this.verifications.get(id);
    if (!raw) {
      return null;
    }
    const hydrated = this.hydrateVerification(raw);
    await this.populateDoctorProfile(hydrated);
    return hydrated;
  }

  public async createDraft(
    doctorId: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    const id = crypto.randomUUID();
    const now = new Date();

    const entity: DoctorVerificationEntity = {
      id,
      doctorId,
      status: DoctorVerificationStatus.DRAFT,
      submissionNotes: notes ?? null,
      rejectionReason: null,
      submittedAt: null,
      reviewedAt: null,
      reviewedBy: null,
      createdAt: now,
      updatedAt: now,
    };

    this.verifications.set(id, entity);
    this.reviews.set(id, []);
    return this.hydrateVerification(entity);
  }

  public async updateDraft(
    id: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    const existing = this.verifications.get(id);
    if (!existing) {
      throw new NotFoundError(`Verification with ID '${id}' not found`);
    }

    const updated: DoctorVerificationEntity = {
      ...existing,
      submissionNotes: notes !== undefined ? notes : existing.submissionNotes,
      updatedAt: new Date(),
    };

    this.verifications.set(id, updated);
    return this.hydrateVerification(updated);
  }

  public async submitForReview(
    id: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    const existing = this.verifications.get(id);
    if (!existing) {
      throw new NotFoundError(`Verification with ID '${id}' not found`);
    }

    const now = new Date();
    const updated: DoctorVerificationEntity = {
      ...existing,
      status: DoctorVerificationStatus.PENDING_REVIEW,
      submissionNotes: notes !== undefined ? notes : existing.submissionNotes,
      submittedAt: now,
      updatedAt: now,
    };

    this.verifications.set(id, updated);

    // Update doctor profile verificationStatus to SUBMITTED
    await this.doctorsRepository.updateVerificationStatus(
      existing.doctorId,
      VerificationStatus.SUBMITTED,
    );

    return this.hydrateVerification(updated);
  }

  public async addDocument(
    verificationId: string,
    doc: CreateDocumentData,
  ): Promise<VerificationDocumentEntity> {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      throw new NotFoundError(`Verification with ID '${verificationId}' not found`);
    }

    // Check unique storageKey
    for (const existingDoc of this.documents.values()) {
      if (existingDoc.storageKey === doc.storageKey) {
        throw new ConflictError('A document with this storage key already exists');
      }
    }

    const documentId = crypto.randomUUID();
    const now = new Date();

    const documentEntity: VerificationDocumentEntity = {
      id: documentId,
      verificationId,
      documentType: doc.documentType,
      storageKey: doc.storageKey,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSizeBytes: doc.fileSizeBytes,
      status: DocumentStatus.ACTIVE,
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(documentId, documentEntity);
    return documentEntity;
  }

  public async findDocumentById(documentId: string): Promise<VerificationDocumentEntity | null> {
    return this.documents.get(documentId) ?? null;
  }

  public async findDocumentsByVerificationId(
    verificationId: string,
  ): Promise<VerificationDocumentEntity[]> {
    const docs: VerificationDocumentEntity[] = [];
    for (const doc of this.documents.values()) {
      if (doc.verificationId === verificationId) {
        docs.push(doc);
      }
    }
    return docs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  public async findVerifications(
    criteria: VerificationFilterCriteria,
  ): Promise<{ verifications: DoctorVerificationEntity[]; total: number }> {
    let matches: DoctorVerificationEntity[] = [];

    for (const v of this.verifications.values()) {
      if (criteria.status && v.status !== criteria.status) {
        continue;
      }
      matches.push(this.hydrateVerification(v));
    }

    // Sort by submittedAt / createdAt descending
    matches.sort((a, b) => {
      const aTime = a.submittedAt ? a.submittedAt.getTime() : a.createdAt.getTime();
      const bTime = b.submittedAt ? b.submittedAt.getTime() : b.createdAt.getTime();
      return bTime - aTime;
    });

    const total = matches.length;
    const offset = criteria.offset ?? 0;
    const limit = criteria.limit ?? 20;

    matches = matches.slice(offset, offset + limit);

    // Populate doctor profiles
    for (const v of matches) {
      await this.populateDoctorProfile(v);
    }

    return { verifications: matches, total };
  }

  public async approveVerification(
    id: string,
    adminId: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    const existing = this.verifications.get(id);
    if (!existing) {
      throw new NotFoundError(`Verification with ID '${id}' not found`);
    }

    const now = new Date();

    // 1. Update verification record
    const updated: DoctorVerificationEntity = {
      ...existing,
      status: DoctorVerificationStatus.APPROVED,
      reviewedAt: now,
      reviewedBy: adminId,
      updatedAt: now,
    };
    this.verifications.set(id, updated);

    // 2. Add review history record
    const reviewId = crypto.randomUUID();
    const reviewRecord: VerificationReviewEntity = {
      id: reviewId,
      verificationId: id,
      reviewerAdminId: adminId,
      action: ReviewAction.APPROVED,
      reason: null,
      notes: notes ?? null,
      createdAt: now,
    };
    const existingReviews = this.reviews.get(id) ?? [];
    existingReviews.push(reviewRecord);
    this.reviews.set(id, existingReviews);

    // 3. Atomically update doctor profile verificationStatus to VERIFIED and set verifiedAt
    await this.doctorsRepository.updateVerificationStatus(
      existing.doctorId,
      VerificationStatus.VERIFIED,
      now,
    );

    const hydrated = this.hydrateVerification(updated);
    await this.populateDoctorProfile(hydrated);
    return hydrated;
  }

  public async rejectVerification(
    id: string,
    adminId: string,
    reason: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    const existing = this.verifications.get(id);
    if (!existing) {
      throw new NotFoundError(`Verification with ID '${id}' not found`);
    }

    const now = new Date();

    // 1. Update verification record
    const updated: DoctorVerificationEntity = {
      ...existing,
      status: DoctorVerificationStatus.REJECTED,
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: adminId,
      updatedAt: now,
    };
    this.verifications.set(id, updated);

    // 2. Add review history record
    const reviewId = crypto.randomUUID();
    const reviewRecord: VerificationReviewEntity = {
      id: reviewId,
      verificationId: id,
      reviewerAdminId: adminId,
      action: ReviewAction.REJECTED,
      reason,
      notes: notes ?? null,
      createdAt: now,
    };
    const existingReviews = this.reviews.get(id) ?? [];
    existingReviews.push(reviewRecord);
    this.reviews.set(id, existingReviews);

    // 3. Atomically update doctor profile verificationStatus to REJECTED
    await this.doctorsRepository.updateVerificationStatus(
      existing.doctorId,
      VerificationStatus.REJECTED,
    );

    const hydrated = this.hydrateVerification(updated);
    await this.populateDoctorProfile(hydrated);
    return hydrated;
  }

  public async getReviewHistory(verificationId: string): Promise<VerificationReviewEntity[]> {
    const list = this.reviews.get(verificationId) ?? [];
    return [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private hydrateVerification(raw: DoctorVerificationEntity): DoctorVerificationEntity {
    const docs = this.getDocumentsForVerificationSync(raw.id);
    const revs = this.reviews.get(raw.id) ?? [];

    return {
      ...raw,
      documents: docs,
      reviews: revs,
    };
  }

  private getDocumentsForVerificationSync(verificationId: string): VerificationDocumentEntity[] {
    const docs: VerificationDocumentEntity[] = [];
    for (const doc of this.documents.values()) {
      if (doc.verificationId === verificationId) {
        docs.push(doc);
      }
    }
    return docs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private async populateDoctorProfile(v: DoctorVerificationEntity): Promise<void> {
    const profile = await this.doctorsRepository.findById(v.doctorId);
    if (profile) {
      v.doctorProfile = {
        id: profile.id,
        userId: profile.userId,
        publicDoctorId: profile.publicDoctorId,
        displayName: profile.displayName,
        medicalRegistrationNumber: profile.medicalRegistrationNumber,
        licensingCouncil: profile.licensingCouncil,
        yearsOfExperience: profile.yearsOfExperience,
      };
    }
  }
}
