import type { VerificationDocumentType } from '../enums/verification-document-type.enum.js';
import type { DocumentStatus } from '../enums/document-status.enum.js';

export interface VerificationDocumentEntity {
  id: string;
  verificationId: string;
  documentType: VerificationDocumentType;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}
