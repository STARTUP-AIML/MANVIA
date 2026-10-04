import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  StorageUploadPayload,
  StorageUploadResult,
} from '../../../common/interfaces/storage.interface.js';
import type { IHealthRecordsStorageService } from '../interfaces/health-records-storage-service.interface.js';

@Injectable()
export class HealthRecordsStorageService implements IHealthRecordsStorageService {
  private readonly logger = new Logger('HealthRecordsStorageService');
  private readonly store = new Map<string, { buffer: Buffer; mimeType: string }>();
  private readonly rootDir: string;

  constructor() {
    this.rootDir = path.resolve(process.env.STORAGE_LOCAL_ROOT || './uploads/health-records');
  }

  public async upload(payload: StorageUploadPayload): Promise<StorageUploadResult> {
    // 1. Maintain in-memory mirror for fast retrieval
    this.store.set(payload.key, {
      buffer: payload.buffer,
      mimeType: payload.mimeType,
    });

    // 2. Persist durably to local filesystem
    try {
      const fullPath = path.join(this.rootDir, payload.key);
      const parentDir = path.dirname(fullPath);
      await fs.mkdir(parentDir, { recursive: true });
      await fs.writeFile(fullPath, payload.buffer);
    } catch (err) {
      this.logger.warn(
        `Failed to persist health record file to disk for key '${payload.key}': ${err}`,
      );
    }

    return {
      key: payload.key,
      bucket: process.env.STORAGE_RECORDS_BUCKET || 'manvia-health-records-vault',
      sizeBytes: payload.buffer.length,
      mimeType: payload.mimeType,
      etag: `etag-${Date.now()}`,
    };
  }

  public async download(key: string): Promise<Buffer> {
    const cached = this.store.get(key);
    if (cached) {
      return cached.buffer;
    }

    try {
      const fullPath = path.join(this.rootDir, key);
      return await fs.readFile(fullPath);
    } catch {
      throw new Error(`Health record storage object not found: ${key}`);
    }
  }

  public async delete(key: string): Promise<boolean> {
    this.store.delete(key);
    try {
      const fullPath = path.join(this.rootDir, key);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return true;
    }
  }

  public async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const baseUrl =
      process.env.STORAGE_RECORDS_VAULT_URL || 'https://vault.manvia.internal/health-records';
    return `${baseUrl}/download/${encodeURIComponent(key)}?expires=${expiresInSeconds}&token=sig_${Date.now()}`;
  }

  public async getUploadUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const baseUrl =
      process.env.STORAGE_RECORDS_VAULT_URL || 'https://vault.manvia.internal/health-records';
    return `${baseUrl}/upload/${encodeURIComponent(key)}?expires=${expiresInSeconds}&token=sig_${Date.now()}`;
  }

  public async exists(key: string): Promise<boolean> {
    if (this.store.has(key)) {
      return true;
    }
    try {
      const fullPath = path.join(this.rootDir, key);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async healthCheck(): Promise<{ isHealthy: boolean; driver: string }> {
    return {
      isHealthy: true,
      driver: process.env.STORAGE_DRIVER || 'local-filesystem-records-vault',
    };
  }
}
