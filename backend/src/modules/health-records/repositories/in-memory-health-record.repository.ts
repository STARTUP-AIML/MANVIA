import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../../../common/errors/app-error.js';
import type { HealthRecordEntity } from '../entities/health-record.entity.js';
import { HealthRecordStatus } from '../enums/health-record-status.enum.js';
import type {
  CreateHealthRecordInput,
  HealthRecordQueryOptions,
  IHealthRecordRepository,
  UpdateHealthRecordInput,
} from '../interfaces/health-record-repository.interface.js';
import { generatePublicHealthRecordId } from '../utils/public-record-id.util.js';

@Injectable()
export class InMemoryHealthRecordRepository implements IHealthRecordRepository {
  private records: Map<string, HealthRecordEntity> = new Map();

  public async create(input: CreateHealthRecordInput): Promise<HealthRecordEntity> {
    const id = randomUUID();
    const publicRecordId = input.publicRecordId ?? generatePublicHealthRecordId();
    const now = new Date();

    const record: HealthRecordEntity = {
      id,
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
      recordedDate: input.recordedDate ? new Date(input.recordedDate) : now,
      createdAt: now,
      updatedAt: now,
    };

    this.records.set(id, record);
    return { ...record };
  }

  public async findById(id: string): Promise<HealthRecordEntity | null> {
    const found = this.records.get(id);
    return found ? { ...found } : null;
  }

  public async findByPublicId(publicRecordId: string): Promise<HealthRecordEntity | null> {
    for (const record of this.records.values()) {
      if (record.publicRecordId === publicRecordId) {
        return { ...record };
      }
    }
    return null;
  }

  public async findPatientRecord(
    patientId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordEntity | null> {
    for (const record of this.records.values()) {
      if (
        record.patientId === patientId &&
        (record.id === recordIdOrPublicId || record.publicRecordId === recordIdOrPublicId)
      ) {
        return { ...record };
      }
    }
    return null;
  }

  public async findMany(
    options: HealthRecordQueryOptions,
  ): Promise<{ data: HealthRecordEntity[]; total: number }> {
    const { patientId, category, status, startDate, endDate, page = 1, limit = 20 } = options;

    let items = Array.from(this.records.values()).filter((r) => r.patientId === patientId);

    if (category) {
      items = items.filter((r) => r.category === category);
    }

    if (status) {
      items = items.filter((r) => r.status === status);
    } else {
      items = items.filter((r) => r.status !== HealthRecordStatus.DELETED);
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      items = items.filter((r) => new Date(r.recordedDate).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      items = items.filter((r) => new Date(r.recordedDate).getTime() <= end);
    }

    items.sort((a, b) => {
      const dateDiff = new Date(b.recordedDate).getTime() - new Date(a.recordedDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit).map((r) => ({ ...r }));

    return { data: paginatedItems, total };
  }

  public async update(id: string, input: UpdateHealthRecordInput): Promise<HealthRecordEntity> {
    const existing = this.records.get(id);
    if (!existing) {
      throw new NotFoundError(`Health record with ID ${id} not found.`);
    }

    const updated: HealthRecordEntity = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.recordedDate !== undefined && { recordedDate: new Date(input.recordedDate) }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: new Date(),
    };

    this.records.set(id, updated);
    return { ...updated };
  }

  public async softDelete(id: string): Promise<HealthRecordEntity> {
    const existing = this.records.get(id);
    if (!existing) {
      throw new NotFoundError(`Health record with ID ${id} not found.`);
    }

    const updated: HealthRecordEntity = {
      ...existing,
      status: HealthRecordStatus.DELETED,
      updatedAt: new Date(),
    };

    this.records.set(id, updated);
    return { ...updated };
  }

  public async countByPatient(patientId: string): Promise<number> {
    return Array.from(this.records.values()).filter(
      (r) => r.patientId === patientId && r.status !== HealthRecordStatus.DELETED,
    ).length;
  }
}
