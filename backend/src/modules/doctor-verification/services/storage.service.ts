import { Injectable } from '@nestjs/common';
import type {
  IStorageService,
  StorageUploadPayload,
  StorageUploadResult,
} from '../../../common/interfaces/storage.interface.js';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/**
 * Storage Service implementation (In-Memory / Driver-ready)
 * Supports private document storage, signed URLs, and lifecycle management.
 */
@Injectable()
export class StorageService implements IStorageService {
  private readonly store = new Map<string, { buffer: Buffer; mimeType: string }>();

  public async upload(payload: StorageUploadPayload): Promise<StorageUploadResult> {
    this.store.set(payload.key, {
      buffer: payload.buffer,
      mimeType: payload.mimeType,
    });

    return {
      key: payload.key,
      bucket: 'manvia-secure-verification-vault',
      sizeBytes: payload.buffer.length,
      mimeType: payload.mimeType,
      etag: `etag-${Date.now()}`,
    };
  }

  public async download(key: string): Promise<Buffer> {
    const item = this.store.get(key);
    if (!item) {
      throw new Error(`Storage object not found: ${key}`);
    }
    return item.buffer;
  }

  public async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  public async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return `https://vault.manvia.internal/secure-access/${encodeURIComponent(key)}?expires=${expiresInSeconds}&token=sig_${Date.now()}`;
  }

  public async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  public async healthCheck(): Promise<{ isHealthy: boolean; driver: string }> {
    return {
      isHealthy: true,
      driver: 'in-memory-vault',
    };
  }
}
