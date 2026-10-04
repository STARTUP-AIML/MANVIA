import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { ConflictError, NotFoundError } from '../../../common/errors/app-error.js';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import { DocumentStatus } from '../enums/document-status.enum.js';
import { ReviewAction } from '../enums/review-action.enum.js';
import type { VerificationDocumentType } from '../enums/verification-document-type.enum.js';
import type { DoctorVerificationEntity } from '../entities/doctor-verification.entity.js';
import type { VerificationDocumentEntity } from '../entities/verification-document.entity.js';
import type { VerificationReviewEntity } from '../entities/verification-review.entity.js';
import type {
  CreateDocumentData,
  IDoctorVerificationRepository,
  VerificationFilterCriteria,
} from '../interfaces/verification-repository.interface.js';
import { VerificationStatus } from '../../doctors/enums/verification-status.enum.js';

interface RawVerificationDocument {
  id: string;
  verificationId: string;
  documentType: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RawVerificationReview {
  id: string;
  verificationId: string;
  reviewerAdminId: string;
  action: string;
  reason: string | null;
  notes: string | null;
  createdAt: string | Date;
}

interface RawDoctorProfileRel {
  id: string;
  userId: string;
  publicDoctorId: string;
  displayName: string;
  medicalRegistrationNumber: string;
  licensingCouncil: string;
  yearsOfExperience: number;
}

interface RawDoctorVerification {
  id: string;
  doctorId: string;
  status: string;
  submissionNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string | Date | null;
  reviewedAt: string | Date | null;
  reviewedBy: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  doctor?: RawDoctorProfileRel;
  documents?: RawVerificationDocument[];
  reviews?: RawVerificationReview[];
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown>; include?: Record<string, unknown> }): Promise<T>;
  findUnique(args: {
    where: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T | null>;
  findFirst(args?: {
    where?: Record<string, unknown>;
    include?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
    include?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<T[]>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
  update(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
    include?: Record<string, unknown>;
  }): Promise<T>;
}

interface PrismaClientLike {
  doctorVerification: PrismaModelDelegate<RawDoctorVerification>;
  verificationDocument: PrismaModelDelegate<RawVerificationDocument>;
  verificationReview: PrismaModelDelegate<RawVerificationReview>;
  doctorProfile: PrismaModelDelegate<RawDoctorProfileRel>;
  $transaction<R>(fn: (tx: PrismaClientLike) => Promise<R>): Promise<R>;
}

@Injectable()
export class PrismaDoctorVerificationRepository implements IDoctorVerificationRepository {
  private readonly prisma: PrismaClientLike;

  constructor(
    @Optional()
    @Inject(PrismaService)
    prismaService?: PrismaService,
  ) {
    this.prisma = (prismaService ?? null) as unknown as PrismaClientLike;
  }

  public async findActiveByDoctorId(doctorId: string): Promise<DoctorVerificationEntity | null> {
    this.ensurePrismaClient();

    const record = await this.prisma.doctorVerification.findFirst({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: true,
        documents: true,
        reviews: true,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  public async findById(id: string): Promise<DoctorVerificationEntity | null> {
    this.ensurePrismaClient();

    const record = await this.prisma.doctorVerification.findUnique({
      where: { id },
      include: {
        doctor: true,
        documents: true,
        reviews: true,
      },
    });

    return record ? this.mapToEntity(record) : null;
  }

  public async createDraft(
    doctorId: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    this.ensurePrismaClient();

    const created = await this.prisma.doctorVerification.create({
      data: {
        doctorId,
        status: DoctorVerificationStatus.DRAFT,
        submissionNotes: notes ?? null,
      },
      include: {
        doctor: true,
        documents: true,
        reviews: true,
      },
    });

    return this.mapToEntity(created);
  }

  public async updateDraft(
    id: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    this.ensurePrismaClient();

    const updated = await this.prisma.doctorVerification.update({
      where: { id },
      data: {
        ...(notes !== undefined ? { submissionNotes: notes } : {}),
      },
      include: {
        doctor: true,
        documents: true,
        reviews: true,
      },
    });

    return this.mapToEntity(updated);
  }

  public async submitForReview(
    id: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    this.ensurePrismaClient();

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.doctorVerification.update({
        where: { id },
        data: {
          status: DoctorVerificationStatus.PENDING_REVIEW,
          submittedAt: now,
          ...(notes !== undefined ? { submissionNotes: notes } : {}),
        },
        include: {
          doctor: true,
          documents: true,
          reviews: true,
        },
      });

      // Update doctor profile status
      await tx.doctorProfile.update({
        where: { id: updated.doctorId },
        data: {
          verificationStatus: VerificationStatus.SUBMITTED,
        },
      });

      return this.mapToEntity(updated);
    });
  }

  public async addDocument(
    verificationId: string,
    doc: CreateDocumentData,
  ): Promise<VerificationDocumentEntity> {
    this.ensurePrismaClient();

    try {
      const created = await this.prisma.verificationDocument.create({
        data: {
          verificationId,
          documentType: doc.documentType,
          storageKey: doc.storageKey,
          originalFileName: doc.originalFileName,
          mimeType: doc.mimeType,
          fileSizeBytes: doc.fileSizeBytes,
          status: DocumentStatus.ACTIVE,
        },
      });

      return this.mapDocumentToEntity(created);
    } catch (err: unknown) {
      if (
        (err instanceof Error && err.message.includes('Unique constraint')) ||
        (err &&
          typeof err === 'object' &&
          'code' in err &&
          (err as { code: string }).code === 'P2002')
      ) {
        throw new ConflictError('A document with this storage key already exists');
      }
      throw err;
    }
  }

  public async findDocumentById(documentId: string): Promise<VerificationDocumentEntity | null> {
    this.ensurePrismaClient();

    const record = await this.prisma.verificationDocument.findUnique({
      where: { id: documentId },
    });

    return record ? this.mapDocumentToEntity(record) : null;
  }

  public async findDocumentsByVerificationId(
    verificationId: string,
  ): Promise<VerificationDocumentEntity[]> {
    this.ensurePrismaClient();

    const list = await this.prisma.verificationDocument.findMany({
      where: { verificationId },
      orderBy: { createdAt: 'asc' },
    });

    return list.map((d) => this.mapDocumentToEntity(d));
  }

  public async findVerifications(
    criteria: VerificationFilterCriteria,
  ): Promise<{ verifications: DoctorVerificationEntity[]; total: number }> {
    this.ensurePrismaClient();

    const where: Record<string, unknown> = {};
    if (criteria.status) {
      where['status'] = criteria.status;
    }

    const [list, total] = await Promise.all([
      this.prisma.doctorVerification.findMany({
        where,
        skip: criteria.offset ?? 0,
        take: criteria.limit ?? 20,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: true,
          documents: true,
          reviews: true,
        },
      }),
      this.prisma.doctorVerification.count({ where }),
    ]);

    return {
      verifications: list.map((v) => this.mapToEntity(v)),
      total,
    };
  }

  public async approveVerification(
    id: string,
    adminId: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    this.ensurePrismaClient();

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update verification
      const updated = await tx.doctorVerification.update({
        where: { id },
        data: {
          status: DoctorVerificationStatus.APPROVED,
          reviewedAt: now,
          reviewedBy: adminId,
        },
        include: {
          doctor: true,
          documents: true,
          reviews: true,
        },
      });

      // 2. Create review record
      await tx.verificationReview.create({
        data: {
          verificationId: id,
          reviewerAdminId: adminId,
          action: ReviewAction.APPROVED,
          notes: notes ?? null,
        },
      });

      // 3. Atomically update doctor profile
      await tx.doctorProfile.update({
        where: { id: updated.doctorId },
        data: {
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedAt: now,
        },
      });

      // Re-fetch with all relations
      const finalRecord = await tx.doctorVerification.findUnique({
        where: { id },
        include: {
          doctor: true,
          documents: true,
          reviews: true,
        },
      });

      if (!finalRecord) {
        throw new NotFoundError('Verification record not found after approval');
      }

      return this.mapToEntity(finalRecord);
    });
  }

  public async rejectVerification(
    id: string,
    adminId: string,
    reason: string,
    notes?: string | undefined,
  ): Promise<DoctorVerificationEntity> {
    this.ensurePrismaClient();

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Update verification
      const updated = await tx.doctorVerification.update({
        where: { id },
        data: {
          status: DoctorVerificationStatus.REJECTED,
          rejectionReason: reason,
          reviewedAt: now,
          reviewedBy: adminId,
        },
        include: {
          doctor: true,
          documents: true,
          reviews: true,
        },
      });

      // 2. Create review record
      await tx.verificationReview.create({
        data: {
          verificationId: id,
          reviewerAdminId: adminId,
          action: ReviewAction.REJECTED,
          reason,
          notes: notes ?? null,
        },
      });

      // 3. Atomically update doctor profile
      await tx.doctorProfile.update({
        where: { id: updated.doctorId },
        data: {
          verificationStatus: VerificationStatus.REJECTED,
        },
      });

      const finalRecord = await tx.doctorVerification.findUnique({
        where: { id },
        include: {
          doctor: true,
          documents: true,
          reviews: true,
        },
      });

      if (!finalRecord) {
        throw new NotFoundError('Verification record not found after rejection');
      }

      return this.mapToEntity(finalRecord);
    });
  }

  public async getReviewHistory(verificationId: string): Promise<VerificationReviewEntity[]> {
    this.ensurePrismaClient();

    const list = await this.prisma.verificationReview.findMany({
      where: { verificationId },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((r) => this.mapReviewToEntity(r));
  }

  private mapToEntity(raw: RawDoctorVerification): DoctorVerificationEntity {
    return {
      id: raw.id,
      doctorId: raw.doctorId,
      status: raw.status as DoctorVerificationStatus,
      submissionNotes: raw.submissionNotes,
      rejectionReason: raw.rejectionReason,
      submittedAt: raw.submittedAt ? new Date(raw.submittedAt) : null,
      reviewedAt: raw.reviewedAt ? new Date(raw.reviewedAt) : null,
      reviewedBy: raw.reviewedBy,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
      documents: raw.documents?.map((d) => this.mapDocumentToEntity(d)),
      reviews: raw.reviews?.map((r) => this.mapReviewToEntity(r)),
      doctorProfile: raw.doctor
        ? {
            id: raw.doctor.id,
            userId: raw.doctor.userId,
            publicDoctorId: raw.doctor.publicDoctorId,
            displayName: raw.doctor.displayName,
            medicalRegistrationNumber: raw.doctor.medicalRegistrationNumber,
            licensingCouncil: raw.doctor.licensingCouncil,
            yearsOfExperience: raw.doctor.yearsOfExperience,
          }
        : undefined,
    };
  }

  private mapDocumentToEntity(raw: RawVerificationDocument): VerificationDocumentEntity {
    return {
      id: raw.id,
      verificationId: raw.verificationId,
      documentType: raw.documentType as VerificationDocumentType,
      storageKey: raw.storageKey,
      originalFileName: raw.originalFileName,
      mimeType: raw.mimeType,
      fileSizeBytes: raw.fileSizeBytes,
      status: raw.status as DocumentStatus,
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  private mapReviewToEntity(raw: RawVerificationReview): VerificationReviewEntity {
    return {
      id: raw.id,
      verificationId: raw.verificationId,
      reviewerAdminId: raw.reviewerAdminId,
      action: raw.action as ReviewAction,
      reason: raw.reason,
      notes: raw.notes,
      createdAt: new Date(raw.createdAt),
    };
  }

  private ensurePrismaClient(): void {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized. Inject a valid PrismaClient instance in production environments.',
      );
    }
  }
}
