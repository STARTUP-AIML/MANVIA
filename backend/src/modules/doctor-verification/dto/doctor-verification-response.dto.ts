import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import { VerificationDocumentResponseDto } from './verification-document-response.dto.js';

export class DoctorVerificationResponseDto {
  @ApiProperty({
    description: 'Unique verification workflow identifier',
    example: 'v1a2b3c4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Current lifecycle status of the verification submission',
    enum: DoctorVerificationStatus,
    example: DoctorVerificationStatus.PENDING_REVIEW,
  })
  status!: DoctorVerificationStatus;

  @ApiPropertyOptional({
    description: 'Notes submitted by the doctor',
    example: 'Updated medical license attached.',
  })
  submissionNotes!: string | null;

  @ApiPropertyOptional({
    description: 'Rejection reason if review was rejected, providing remediation guidance',
    example: null,
  })
  rejectionReason!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when submission was officially submitted for review',
    example: '2026-09-29T10:00:00.000Z',
  })
  submittedAt!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when administrative review decision was finalized',
    example: null,
  })
  reviewedAt!: string | null;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2026-09-29T09:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2026-09-29T10:00:00.000Z',
  })
  updatedAt!: string;

  @ApiProperty({
    description: 'Uploaded verification credentials and supporting documents',
    type: [VerificationDocumentResponseDto],
  })
  documents!: VerificationDocumentResponseDto[];
}
