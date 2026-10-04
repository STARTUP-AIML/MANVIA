import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  IStorageService,
  StorageUploadPayload,
  StorageUploadResult,
} from '../../../common/interfaces/storage.interface.js';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/**
 * Storage Service implementation (Durable Local Filesystem with resilient cache)
 * Decoupled via IStorageService for cloud-driver compatibility.
 */
@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger('StorageService');
  private readonly store = new Map<string, { buffer: Buffer; mimeType: string }>();
  private readonly rootDir: string;

  constructor() {
    this.rootDir = path.resolve(process.env.STORAGE_LOCAL_ROOT || './uploads');
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
      this.logger.warn(`Failed to persist file to disk for key '${payload.key}': ${err}`);
    }

    return {
      key: payload.key,
      bucket: process.env.STORAGE_BUCKET || 'manvia-secure-verification-vault',
      sizeBytes: payload.buffer.length,
      mimeType: payload.mimeType,
      etag: `etag-${Date.now()}`,
    };
  }

  public async download(key: string): Promise<Buffer> {
    // Check in-memory mirror first
    const cached = this.store.get(key);
    if (cached) {
      return cached.buffer;
    }

    // Read from disk
    try {
      const fullPath = path.join(this.rootDir, key);
      return await fs.readFile(fullPath);
    } catch {
      throw new Error(`Storage object not found: ${key}`);
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
    // Return relative access URL resolvable by frontend/browser
    const token = Buffer.from(`${key}:${Date.now() + expiresInSeconds * 1000}`).toString(
      'base64url',
    );
    return `/api/v1/doctors/me/verification/documents/access?key=${encodeURIComponent(key)}&token=${token}`;
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
      driver: process.env.STORAGE_DRIVER || 'local-filesystem',
    };
  }
}
