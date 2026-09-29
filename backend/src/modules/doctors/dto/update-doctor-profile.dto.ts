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
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DoctorSpecialtyAssignmentDto,
  DoctorLanguageAssignmentDto,
  DoctorQualificationInputDto,
} from './create-doctor-profile.dto.js';

export class UpdateDoctorProfileDto {
  @ApiPropertyOptional({
    description: 'Updated professional public display name',
    example: 'Dr. Rajesh Nair, MD, FACC',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  displayName?: string | undefined;

  @ApiPropertyOptional({
    description: 'Updated professional biography and clinical statement',
    example: 'Senior cardiologist with updated focus on preventative cardiology.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string | undefined;

  @ApiPropertyOptional({
    description: 'Updated years of clinical experience',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  yearsOfExperience?: number | undefined;

  @ApiPropertyOptional({
    description: 'Updated standard consultation fee',
    example: 60.0,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  defaultConsultationFee?: number | undefined;

  @ApiPropertyOptional({
    description: 'Updated ISO-4217 3-letter currency code',
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string | undefined;

  @ApiPropertyOptional({
    description: 'Updated specialties associated with the physician',
    type: [DoctorSpecialtyAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorSpecialtyAssignmentDto)
  specialties?: DoctorSpecialtyAssignmentDto[] | undefined;

  @ApiPropertyOptional({
    description: 'Updated languages spoken by the physician',
    type: [DoctorLanguageAssignmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorLanguageAssignmentDto)
  languages?: DoctorLanguageAssignmentDto[] | undefined;

  @ApiPropertyOptional({
    description: 'Updated structured educational and professional qualifications',
    type: [DoctorQualificationInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorQualificationInputDto)
  qualifications?: DoctorQualificationInputDto[] | undefined;
}
