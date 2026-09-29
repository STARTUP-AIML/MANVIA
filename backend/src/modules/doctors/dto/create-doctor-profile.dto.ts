import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsNumber,
  Length,
  IsArray,
  ValidateNested,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DoctorSpecialtyAssignmentDto {
  @ApiProperty({
    description: 'UUID of the medical specialty',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID()
  specialtyId!: string;

  @ApiPropertyOptional({
    description: 'Designates this specialty as the primary specialty',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean | undefined;
}

export class DoctorLanguageAssignmentDto {
  @ApiProperty({
    description: 'UUID of the spoken language',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID()
  languageId!: string;
}

export class DoctorQualificationInputDto {
  @ApiProperty({
    description: 'Degree or qualification title (e.g. MBBS, MD, MS, Board Certified)',
    example: 'MBBS, MD (Cardiology)',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  qualification!: string;

  @ApiProperty({
    description: 'Educational institution, university, or medical college',
    example: 'Johns Hopkins University School of Medicine',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  institution!: string;

  @ApiPropertyOptional({
    description: 'Specialized field or sub-discipline',
    example: 'Cardiovascular Medicine',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldOfStudy?: string | undefined;

  @ApiPropertyOptional({
    description: 'Year degree or qualification was conferred',
    example: 2014,
  })
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  graduationYear?: number | undefined;
}

export class CreateDoctorProfileDto {
  @ApiProperty({
    description: 'Professional public display name / professional title',
    example: 'Dr. Rajesh Nair, MD',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  displayName!: string;

  @ApiProperty({
    description: 'Official medical council registration or license identifier',
    example: 'MCI-2008-84729',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  medicalRegistrationNumber!: string;

  @ApiProperty({
    description: 'Official licensing council or state board that issued the credential',
    example: 'Medical Council of India',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  licensingCouncil!: string;

  @ApiPropertyOptional({
    description: 'Years of post-qualification clinical experience',
    example: 12,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  yearsOfExperience?: number | undefined;

  @ApiPropertyOptional({
    description: 'Standard base consultation fee',
    example: 45.0,
    default: 0.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  defaultConsultationFee?: number | undefined;

  @ApiPropertyOptional({
    description: 'ISO-4217 3-letter currency code',
    example: 'USD',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string | undefined;

  @ApiPropertyOptional({
    description: 'Professional biography and background statement',
    example:
      'Board-certified cardiologist specializing in preventive cardiovascular wellness and longitudinal management.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | undefined;

  @ApiPropertyOptional({
    description: 'Normalized specialties associated with the physician',
    type: [DoctorSpecialtyAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorSpecialtyAssignmentDto)
  specialties?: DoctorSpecialtyAssignmentDto[] | undefined;

  @ApiPropertyOptional({
    description: 'Normalized languages spoken by the physician',
    type: [DoctorLanguageAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorLanguageAssignmentDto)
  languages?: DoctorLanguageAssignmentDto[] | undefined;

  @ApiPropertyOptional({
    description: 'Structured educational and professional qualifications',
    type: [DoctorQualificationInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorQualificationInputDto)
  qualifications?: DoctorQualificationInputDto[] | undefined;
}
