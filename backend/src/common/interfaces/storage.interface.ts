/**
 * Generic Storage Service Abstraction (Phase 0 ADR-006 / OD-002)
 *
 * Designed to decouple early doctor verification document uploads (Phase 8)
 * and future document handling from specific cloud storage vendors.
 *
 * Driver implementations:
 *   - Local filesystem (development / testing)
 *   - MinIO (development / staging / Docker)
 *   - S3-compatible cloud object store (AWS S3, Cloudflare R2, GCS)
 */

export interface StorageUploadPayload {
  key: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  key: string;
  bucket: string;
  sizeBytes: number;
  mimeType: string;
  etag?: string;
}

export interface IStorageService {
  /**
   * Upload an object into the configured storage provider.
   */
  upload(payload: StorageUploadPayload): Promise<StorageUploadResult>;

  /**
   * Download raw object buffer by key.
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete an object by key.
   */
  delete(key: string): Promise<boolean>;

  /**
   * Generate a time-limited signed URL for secure object retrieval.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Check whether an object exists at the specified key.
   */
  exists(key: string): Promise<boolean>;

  /**
   * Verify storage provider connectivity and operational readiness.
   */
  healthCheck(): Promise<{
    isHealthy: boolean;
    driver: string;
    details?: string;
  }>;
}
