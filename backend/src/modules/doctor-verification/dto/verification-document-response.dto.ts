import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationDocumentType } from '../enums/verification-document-type.enum.js';
import { DocumentStatus } from '../enums/document-status.enum.js';

export class VerificationDocumentResponseDto {
  @ApiProperty({
    description: 'Unique document identifier',
    example: 'd1a2b3c4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Type of verification document',
    enum: VerificationDocumentType,
    example: VerificationDocumentType.MEDICAL_LICENSE,
  })
  documentType!: VerificationDocumentType;

  @ApiProperty({
    description: 'Original name of uploaded document',
    example: 'medical_license_2026.pdf',
  })
  originalFileName!: string;

  @ApiProperty({
    description: 'MIME type of document',
    example: 'application/pdf',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 524288,
  })
  fileSizeBytes!: number;

  @ApiProperty({
    description: 'Document lifecycle status',
    enum: DocumentStatus,
    example: DocumentStatus.ACTIVE,
  })
  status!: DocumentStatus;

  @ApiProperty({
    description: 'Timestamp when document was uploaded',
    example: '2026-09-29T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiPropertyOptional({
    description: 'Authorized temporary signed download URL (when requested directly)',
    example: 'https://storage.manvia.internal/signed/docs/doc-123.pdf?expires=300',
  })
  accessUrl?: string | undefined;
}
