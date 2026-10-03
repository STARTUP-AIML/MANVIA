import { Injectable } from '@nestjs/common';
import type {
  StorageUploadPayload,
  StorageUploadResult,
} from '../../../common/interfaces/storage.interface.js';
import type { IHealthRecordsStorageService } from '../interfaces/health-records-storage-service.interface.js';

@Injectable()
export class HealthRecordsStorageService implements IHealthRecordsStorageService {
  private readonly store = new Map<string, { buffer: Buffer; mimeType: string }>();

  public async upload(payload: StorageUploadPayload): Promise<StorageUploadResult> {
    this.store.set(payload.key, {
      buffer: payload.buffer,
      mimeType: payload.mimeType,
    });

    return {
      key: payload.key,
      bucket: 'manvia-health-records-vault',
      sizeBytes: payload.buffer.length,
      mimeType: payload.mimeType,
      etag: `etag-${Date.now()}`,
    };
  }

  public async download(key: string): Promise<Buffer> {
    const item = this.store.get(key);
    if (!item) {
      throw new Error(`Health record storage object not found: ${key}`);
    }
    return item.buffer;
  }

  public async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  public async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return `https://vault.manvia.internal/health-records/download/${encodeURIComponent(key)}?expires=${expiresInSeconds}&token=sig_${Date.now()}`;
  }

  public async getUploadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return `https://vault.manvia.internal/health-records/upload/${encodeURIComponent(key)}?expires=${expiresInSeconds}&token=sig_${Date.now()}`;
  }

  public async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  public async healthCheck(): Promise<{ isHealthy: boolean; driver: string }> {
    return {
      isHealthy: true,
      driver: 'in-memory-health-records-vault',
    };
  }
}
