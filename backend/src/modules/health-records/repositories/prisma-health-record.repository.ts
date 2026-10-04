import { Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { HealthRecordEntity } from '../entities/health-record.entity.js';
import { HealthRecordCategory } from '../enums/health-record-category.enum.js';
import { HealthRecordStatus } from '../enums/health-record-status.enum.js';
import type {
  CreateHealthRecordInput,
  HealthRecordQueryOptions,
  IHealthRecordRepository,
  UpdateHealthRecordInput,
} from '../interfaces/health-record-repository.interface.js';
import { generatePublicHealthRecordId } from '../utils/public-record-id.util.js';

interface RawHealthRecord {
  id: string;
  publicRecordId: string;
  patientId: string;
  uploadedByUserId: string;
  category: HealthRecordCategory;
  title: string;
  description: string | null;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash: string | null;
  status: HealthRecordStatus;
  recordedDate: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface PrismaModelDelegate<T = Record<string, unknown>> {
  create(args: { data: Record<string, unknown> }): Promise<T>;
  findUnique(args: { where: Record<string, unknown> }): Promise<T | null>;
  findFirst?(args: { where: Record<string, unknown> }): Promise<T | null>;
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    skip?: number;
    take?: number;
  }): Promise<T[]>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<T>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
}

interface PrismaClientLike {
  healthRecord: PrismaModelDelegate<RawHealthRecord>;
}

@Injectable()
export class PrismaHealthRecordRepository implements IHealthRecordRepository {
  private readonly prisma: PrismaClientLike | undefined;

  constructor(
    @Optional()
    @Inject(PrismaService)
    prisma?: PrismaClientLike | PrismaService,
  ) {
    this.prisma = (prisma ?? undefined) as unknown as PrismaClientLike | undefined;
  }

  private getClient(): PrismaClientLike {
    if (!this.prisma) {
      throw new Error(
        'PrismaClient is not initialized in PrismaHealthRecordRepository. Provide a valid Prisma client or use InMemoryHealthRecordRepository.',
      );
    }
    return this.prisma;
  }

  private mapToEntity(raw: RawHealthRecord): HealthRecordEntity {
    return {
      id: raw.id,
      publicRecordId: raw.publicRecordId,
      patientId: raw.patientId,
      uploadedByUserId: raw.uploadedByUserId,
      category: raw.category,
      title: raw.title,
      description: raw.description,
      storageKey: raw.storageKey,
      originalFileName: raw.originalFileName,
      mimeType: raw.mimeType,
      fileSizeBytes: raw.fileSizeBytes,
      sha256Hash: raw.sha256Hash,
      status: raw.status,
      recordedDate: new Date(raw.recordedDate),
      createdAt: new Date(raw.createdAt),
      updatedAt: new Date(raw.updatedAt),
    };
  }

  public async create(input: CreateHealthRecordInput): Promise<HealthRecordEntity> {
    const client = this.getClient();
    const publicRecordId = input.publicRecordId ?? generatePublicHealthRecordId();
    const recordedDate = input.recordedDate ? new Date(input.recordedDate) : new Date();

    const created = await client.healthRecord.create({
      data: {
        publicRecordId,
        patientId: input.patientId,
        uploadedByUserId: input.uploadedByUserId,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        storageKey: input.storageKey,
        originalFileName: input.originalFileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        sha256Hash: input.sha256Hash ?? null,
        status: input.status ?? HealthRecordStatus.AVAILABLE,
        recordedDate,
      },
    });

    return this.mapToEntity(created);
  }

  public async findById(id: string): Promise<HealthRecordEntity | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    const client = this.getClient();
    const found = await client.healthRecord.findUnique({
      where: { id },
    });
    return found ? this.mapToEntity(found) : null;
  }

  public async findByPublicId(publicRecordId: string): Promise<HealthRecordEntity | null> {
    const client = this.getClient();
    const found = await client.healthRecord.findUnique({
      where: { publicRecordId },
    });
    return found ? this.mapToEntity(found) : null;
  }

  public async findPatientRecord(
    patientId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordEntity | null> {
    const client = this.getClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        recordIdOrPublicId,
      );

    if (!client.healthRecord.findFirst) {
      if (isUuid) {
        const byId = await this.findById(recordIdOrPublicId);
        if (byId && byId.patientId === patientId) return byId;
      }
      const byPub = await this.findByPublicId(recordIdOrPublicId);
      if (byPub && byPub.patientId === patientId) return byPub;
      return null;
    }

    const where: Record<string, unknown> = {
      patientId,
      ...(isUuid ? { id: recordIdOrPublicId } : { publicRecordId: recordIdOrPublicId }),
    };

    const found = await client.healthRecord.findFirst({ where });
    return found ? this.mapToEntity(found) : null;
  }

  public async findMany(
    options: HealthRecordQueryOptions,
  ): Promise<{ data: HealthRecordEntity[]; total: number }> {
    const client = this.getClient();
    const { patientId, category, status, startDate, endDate, page = 1, limit = 20 } = options;

    const where: Record<string, unknown> = {
      patientId,
    };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { not: HealthRecordStatus.DELETED };
    }

    if (startDate || endDate) {
      const recordedDateFilter: Record<string, unknown> = {};
      if (startDate) {
        recordedDateFilter.gte = new Date(startDate);
      }
      if (endDate) {
        recordedDateFilter.lte = new Date(endDate);
      }
      where.recordedDate = recordedDateFilter;
    }

    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      client.healthRecord.findMany({
        where,
        orderBy: [{ recordedDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      client.healthRecord.count ? client.healthRecord.count({ where }) : Promise.resolve(0),
    ]);

    return {
      data: rows.map((r) => this.mapToEntity(r)),
      total,
    };
  }

  public async update(id: string, input: UpdateHealthRecordInput): Promise<HealthRecordEntity> {
    const client = this.getClient();
    let targetId = id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      const byPub = await this.findByPublicId(id);
      if (!byPub) {
        throw new NotFoundError(`Health record with ID ${id} not found.`);
      }
      targetId = byPub.id;
    }

    try {
      const updated = await client.healthRecord.update({
        where: { id: targetId },
        data: {
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.recordedDate !== undefined && { recordedDate: new Date(input.recordedDate) }),
          ...(input.status !== undefined && { status: input.status }),
        },
      });
      return this.mapToEntity(updated);
    } catch {
      throw new NotFoundError(`Health record with ID ${id} not found.`);
    }
  }

  public async softDelete(id: string): Promise<HealthRecordEntity> {
    const client = this.getClient();
    let targetId = id;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      const byPub = await this.findByPublicId(id);
      if (!byPub) {
        throw new NotFoundError(`Health record with ID ${id} not found.`);
      }
      targetId = byPub.id;
    }

    try {
      const updated = await client.healthRecord.update({
        where: { id: targetId },
        data: {
          status: HealthRecordStatus.DELETED,
        },
      });
      return this.mapToEntity(updated);
    } catch {
      throw new NotFoundError(`Health record with ID ${id} not found.`);
    }
  }

  public async countByPatient(patientId: string): Promise<number> {
    const client = this.getClient();
    if (!client.healthRecord.count) {
      return 0;
    }
    return client.healthRecord.count({
      where: {
        patientId,
        status: { not: HealthRecordStatus.DELETED },
      },
    });
  }
}
