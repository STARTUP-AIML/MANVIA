import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorPublicQualificationDto {
  @ApiProperty({ example: 'MBBS, MD (Cardiology)' })
  qualification!: string;

  @ApiProperty({ example: 'Johns Hopkins University School of Medicine' })
  institution!: string;

  @ApiPropertyOptional({ example: 'Cardiovascular Medicine' })
  fieldOfStudy?: string | null | undefined;

  @ApiPropertyOptional({ example: 2014 })
  graduationYear?: number | null | undefined;
}

export class DoctorPublicResponseDto {
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
    example: 'Consultant cardiologist specializing in preventative care.',
  })
  bio?: string | null | undefined;

  @ApiPropertyOptional({
    description: 'Primary medical specialty name',
    example: 'Internal Medicine',
  })
  primarySpecialty?: string | null | undefined;

  @ApiProperty({
    description: 'Sub-specialties or secondary specialties',
    example: ['Cardiology', 'Preventive Care'],
    type: [String],
  })
  subSpecialties!: string[];

  @ApiProperty({
    description: 'Languages spoken by the physician',
    example: ['English', 'Hindi', 'Malayalam'],
    type: [String],
  })
  languages!: string[];

  @ApiProperty({
    description: 'Years of clinical experience',
    example: 18,
  })
  yearsOfExperience!: number;

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

  @ApiProperty({
    description: 'Current platform verification status',
    example: 'VERIFIED',
  })
  verificationStatus!: string;

  @ApiProperty({
    description: 'Public qualifications',
    type: [DoctorPublicQualificationDto],
  })
  qualifications!: DoctorPublicQualificationDto[];
}
