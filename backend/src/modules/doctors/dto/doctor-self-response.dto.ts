import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorSelfSpecialtyDto {
  @ApiProperty({ example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33' })
  id!: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  specialtyId!: string;

  @ApiProperty({ example: 'CARDIO' })
  code!: string;

  @ApiProperty({ example: 'Cardiology' })
  name!: string;

  @ApiProperty({ example: true })
  isPrimary!: boolean;
}

export class DoctorSelfLanguageDto {
  @ApiProperty({ example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44' })
  id!: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22' })
  languageId!: string;

  @ApiProperty({ example: 'en' })
  code!: string;

  @ApiProperty({ example: 'English' })
  name!: string;
}

export class DoctorSelfQualificationDto {
  @ApiProperty({ example: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55' })
  id!: string;

  @ApiProperty({ example: 'MBBS, MD (Cardiology)' })
  qualification!: string;

  @ApiProperty({ example: 'Johns Hopkins University School of Medicine' })
  institution!: string;

  @ApiPropertyOptional({ example: 'Cardiovascular Medicine' })
  fieldOfStudy?: string | null | undefined;

  @ApiPropertyOptional({ example: 2014 })
  graduationYear?: number | null | undefined;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  updatedAt!: string;
}

export class DoctorSelfResponseDto {
  @ApiProperty({
    description: 'Internal doctor profile primary key',
    example: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a66',
  })
  id!: string;

  @ApiProperty({
    description: 'Central user identity anchor ID',
    example: '10eebc99-9c0b-4ef8-bb6d-6bb9bd380a77',
  })
  userId!: string;

  @ApiProperty({
    description: 'Human-readable public doctor identifier',
    example: 'DOC-90218471',
  })
  publicDoctorId!: string;

  @ApiProperty({
    description: 'Professional public display name',
    example: 'Dr. Rajesh Nair, MD',
  })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Professional biography',
    example: 'Board-certified cardiologist specializing in preventive cardiovascular wellness.',
  })
  bio?: string | null | undefined;

  @ApiProperty({
    description: 'Official medical council registration number (private)',
    example: 'MCI-2008-84729',
  })
  medicalRegistrationNumber!: string;

  @ApiProperty({
    description: 'Licensing medical council or governing body (private)',
    example: 'Medical Council of India',
  })
  licensingCouncil!: string;

  @ApiProperty({
    description: 'Years of clinical experience',
    example: 12,
  })
  yearsOfExperience!: number;

  @ApiProperty({
    description: 'Current platform verification status',
    example: 'DRAFT',
  })
  verificationStatus!: string;

  @ApiProperty({
    description: 'Base consultation fee',
    example: 45.0,
  })
  defaultConsultationFee!: number;

  @ApiProperty({
    description: 'ISO-4217 Currency code',
    example: 'USD',
  })
  currency!: string;

  @ApiPropertyOptional({
    description: 'Timestamp when verification was administratively granted',
    example: null,
  })
  verifiedAt?: string | null | undefined;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-09-29T10:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({
    description: 'Physician specialties',
    type: [DoctorSelfSpecialtyDto],
  })
  specialties!: DoctorSelfSpecialtyDto[];

  @ApiProperty({
    description: 'Physician languages',
    type: [DoctorSelfLanguageDto],
  })
  languages!: DoctorSelfLanguageDto[];

  @ApiProperty({
    description: 'Physician qualifications',
    type: [DoctorSelfQualificationDto],
  })
  qualifications!: DoctorSelfQualificationDto[];
}
