import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DoctorVerificationStatus } from '../enums/doctor-verification-status.enum.js';
import { VerificationDocumentResponseDto } from './verification-document-response.dto.js';
import { VerificationReviewResponseDto } from './verification-review-response.dto.js';

export class AdminDoctorSummaryDto {
  @ApiProperty({
    description: 'Unique internal doctor profile identifier',
    example: 'doc-00000000-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Associated user identity ID',
    example: 'usr-00000000-0000-0000-0000-000000000001',
  })
  userId!: string;

  @ApiProperty({
    description: 'Public pseudonymous doctor identifier',
    example: 'DOC-AB12CD',
  })
  publicDoctorId!: string;

  @ApiProperty({
    description: 'Full legal/professional name of physician',
    example: 'Dr. Jane Smith, MD',
  })
  displayName!: string;

  @ApiProperty({
    description: 'Government/state medical license or registration number',
    example: 'MED-REG-987654',
  })
  medicalRegistrationNumber!: string;

  @ApiProperty({
    description: 'Official state medical board or licensing council',
    example: 'State Medical Council of California',
  })
  licensingCouncil!: string;

  @ApiProperty({
    description: 'Years of clinical medical practice',
    example: 12,
  })
  yearsOfExperience!: number;
}

export class AdminVerificationDetailResponseDto {
  @ApiProperty({
    description: 'Unique verification workflow identifier',
    example: 'v1a2b3c4-0000-0000-0000-000000000001',
  })
  id!: string;

  @ApiProperty({
    description: 'Doctor profile UUID',
    example: 'doc-00000000-0000-0000-0000-000000000001',
  })
  doctorId!: string;

  @ApiProperty({
    description: 'Current verification lifecycle status',
    enum: DoctorVerificationStatus,
    example: DoctorVerificationStatus.PENDING_REVIEW,
  })
  status!: DoctorVerificationStatus;

  @ApiPropertyOptional({
    description: 'Notes submitted by the doctor',
    example: 'Uploaded certified copies of degree and state medical license.',
  })
  submissionNotes!: string | null;

  @ApiPropertyOptional({
    description: 'Rejection reason if status is REJECTED',
    example: null,
  })
  rejectionReason!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when submission entered PENDING_REVIEW',
    example: '2026-09-29T10:00:00.000Z',
  })
  submittedAt!: string | null;

  @ApiPropertyOptional({
    description: 'Timestamp when review decision was recorded',
    example: null,
  })
  reviewedAt!: string | null;

  @ApiPropertyOptional({
    description: 'Admin user ID who finalized the most recent review decision',
    example: null,
  })
  reviewedBy!: string | null;

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

  @ApiPropertyOptional({
    description: 'Doctor profile professional details',
    type: AdminDoctorSummaryDto,
  })
  doctorProfile?: AdminDoctorSummaryDto | undefined;

  @ApiProperty({
    description: 'List of uploaded verification credentials and documents',
    type: [VerificationDocumentResponseDto],
  })
  documents!: VerificationDocumentResponseDto[];

  @ApiProperty({
    description: 'Complete audit history of previous review actions for this verification workflow',
    type: [VerificationReviewResponseDto],
  })
  reviews!: VerificationReviewResponseDto[];
}

export class AdminVerificationListResponseDto {
  @ApiProperty({
    description: 'List of doctor verification submissions matching query criteria',
    type: [AdminVerificationDetailResponseDto],
  })
  items!: AdminVerificationDetailResponseDto[];

  @ApiProperty({
    description: 'Total number of submissions matching query criteria',
    example: 42,
  })
  total!: number;

  @ApiProperty({
    description: 'Current query limit applied',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Current query offset applied',
    example: 0,
  })
  offset!: number;
}
