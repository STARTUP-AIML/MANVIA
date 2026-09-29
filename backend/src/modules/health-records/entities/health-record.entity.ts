import type { HealthRecordCategory } from '../enums/health-record-category.enum.js';
import type { HealthRecordStatus } from '../enums/health-record-status.enum.js';

export interface HealthRecordEntity {
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
  recordedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
