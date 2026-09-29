import type { HealthRecordEntity } from '../entities/health-record.entity.js';
import type { HealthRecordCategory } from '../enums/health-record-category.enum.js';
import type { HealthRecordStatus } from '../enums/health-record-status.enum.js';

export interface CreateHealthRecordInput {
  publicRecordId?: string | undefined;
  patientId: string;
  uploadedByUserId: string;
  category: HealthRecordCategory;
  title: string;
  description?: string | null | undefined;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256Hash?: string | null | undefined;
  status?: HealthRecordStatus | undefined;
  recordedDate: Date;
}

export interface UpdateHealthRecordInput {
  title?: string | undefined;
  description?: string | null | undefined;
  category?: HealthRecordCategory | undefined;
  recordedDate?: Date | undefined;
  status?: HealthRecordStatus | undefined;
}

export interface HealthRecordQueryOptions {
  patientId: string;
  category?: HealthRecordCategory | undefined;
  status?: HealthRecordStatus | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface IHealthRecordRepository {
  create(input: CreateHealthRecordInput): Promise<HealthRecordEntity>;
  findById(id: string): Promise<HealthRecordEntity | null>;
  findByPublicId(publicRecordId: string): Promise<HealthRecordEntity | null>;
  findPatientRecord(
    patientId: string,
    recordIdOrPublicId: string,
  ): Promise<HealthRecordEntity | null>;
  findMany(
    options: HealthRecordQueryOptions,
  ): Promise<{ data: HealthRecordEntity[]; total: number }>;
  update(id: string, input: UpdateHealthRecordInput): Promise<HealthRecordEntity>;
  softDelete(id: string): Promise<HealthRecordEntity>;
  countByPatient(patientId: string): Promise<number>;
}

export const HEALTH_RECORD_REPOSITORY = Symbol('HEALTH_RECORD_REPOSITORY');
