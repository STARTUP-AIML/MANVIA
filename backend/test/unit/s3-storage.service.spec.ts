import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S3StorageService } from '../../src/common/storage/s3-storage.service.js';
import type { ConfigService } from '../../src/config/config.service.js';

describe('S3StorageService (M8 Production Cloud Object Storage)', () => {
  let storageService: S3StorageService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      raw: {
        STORAGE_DRIVER: 's3',
        STORAGE_BUCKET: 'manvia-test-vault',
        STORAGE_REGION: 'us-east-1',
        STORAGE_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE',
        STORAGE_SECRET_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        STORAGE_ENDPOINT: 'https://s3.us-east-1.amazonaws.com',
      } as unknown as ConfigService['raw'],
    };
    storageService = new S3StorageService(mockConfigService as ConfigService);
  });

  describe('Presigned URLs (AWS Signature Version 4)', () => {
    it('should generate valid AWS SigV4 presigned download URL with required query parameters', async () => {
      const url = await storageService.getSignedUrl('records/patient-1/lab-report.pdf', 900);

      expect(url).toContain(
        'https://s3.us-east-1.amazonaws.com/manvia-test-vault/records/patient-1/lab-report.pdf',
      );
      expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(url).toContain('X-Amz-Credential=AKIAIOSFODNN7EXAMPLE');
      expect(url).toContain('X-Amz-Expires=900');
      expect(url).toContain('X-Amz-Signature=');
      expect(url).toContain('X-Amz-SignedHeaders=host');
    });

    it('should generate valid AWS SigV4 presigned upload URL with PUT method semantics', async () => {
      const uploadUrl = await storageService.getUploadUrl('uploads/quarantine/doc-123.pdf', 600);

      expect(uploadUrl).toContain(
        'https://s3.us-east-1.amazonaws.com/manvia-test-vault/uploads/quarantine/doc-123.pdf',
      );
      expect(uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(uploadUrl).toContain('X-Amz-Expires=600');
      expect(uploadUrl).toContain('X-Amz-Signature=');
    });
  });

  describe('Document Validation & Security Controls', () => {
    it('should reject file upload when MIME type is not allowed', async () => {
      const maliciousPayload = {
        key: 'malicious.exe',
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // Windows executable header
        mimeType: 'application/x-msdownload',
      };

      await expect(storageService.upload(maliciousPayload)).rejects.toThrow(
        'Unsupported document MIME type',
      );
    });

    it('should reject file when MIME type claims PDF but magic bytes do not match %PDF', async () => {
      const spoofedPayload = {
        key: 'records/spoofed.pdf',
        buffer: Buffer.from('NOT A REAL PDF FILE HEADER'),
        mimeType: 'application/pdf',
      };

      await expect(storageService.upload(spoofedPayload)).rejects.toThrow(
        'File magic byte verification failed: invalid PDF signature',
      );
    });

    it('should accept valid PDF document matching %PDF magic bytes', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ etag: '"etag-12345"' }),
        text: async () => '',
      });

      try {
        const validPdfPayload = {
          key: 'records/valid.pdf',
          buffer: Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('test content')]),
          mimeType: 'application/pdf',
        };

        const result = await storageService.upload(validPdfPayload);
        expect(result.key).toBe('records/valid.pdf');
        expect(result.bucket).toBe('manvia-test-vault');
        expect(result.mimeType).toBe('application/pdf');

        const downloaded = await storageService.download('records/valid.pdf');
        expect(downloaded.toString()).toContain('%PDF-1.7');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('Health Check', () => {
    it('should report healthy and display driver details', async () => {
      const health = await storageService.healthCheck();
      expect(health.isHealthy).toBe(true);
      expect(health.driver).toBe('s3-compatible');
      expect(health.details).toContain('manvia-test-vault');
    });
  });
});
