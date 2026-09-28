import { describe, it, expect } from 'vitest';
import type {
  IStorageService,
  StorageUploadPayload,
  StorageUploadResult,
} from '../../src/common/interfaces/storage.interface.js';

class MockStorageService implements IStorageService {
  private readonly store = new Map<string, Buffer>();

  async upload(payload: StorageUploadPayload): Promise<StorageUploadResult> {
    this.store.set(payload.key, payload.buffer);
    return {
      key: payload.key,
      bucket: 'test-bucket',
      sizeBytes: payload.buffer.length,
      mimeType: payload.mimeType,
      etag: 'mock-etag-123',
    };
  }

  async download(key: string): Promise<Buffer> {
    const data = this.store.get(key);
    if (!data) throw new Error('File not found');
    return data;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return `https://mock-storage.local/test-bucket/${key}?expires=${expiresInSeconds}`;
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async healthCheck(): Promise<{ isHealthy: boolean; driver: string }> {
    return { isHealthy: true, driver: 'mock' };
  }
}

describe('Storage Service Interface (Unit Contract)', () => {
  it('should satisfy storage contract for upload, download, and delete', async () => {
    const storage: IStorageService = new MockStorageService();
    const testBuffer = Buffer.from('medical-verification-document-data');

    const uploadRes = await storage.upload({
      key: 'doctors/doc-123/license.pdf',
      buffer: testBuffer,
      mimeType: 'application/pdf',
    });

    expect(uploadRes.key).toBe('doctors/doc-123/license.pdf');
    expect(uploadRes.sizeBytes).toBe(testBuffer.length);

    expect(await storage.exists('doctors/doc-123/license.pdf')).toBe(true);

    const downloaded = await storage.download('doctors/doc-123/license.pdf');
    expect(downloaded.toString()).toBe('medical-verification-document-data');

    const signedUrl = await storage.getSignedUrl('doctors/doc-123/license.pdf');
    expect(signedUrl).toContain('https://mock-storage.local');

    const deleted = await storage.delete('doctors/doc-123/license.pdf');
    expect(deleted).toBe(true);
    expect(await storage.exists('doctors/doc-123/license.pdf')).toBe(false);

    const health = await storage.healthCheck();
    expect(health.isHealthy).toBe(true);
  });
});
