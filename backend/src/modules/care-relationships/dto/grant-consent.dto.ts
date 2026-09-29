import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ConsentScope } from '../enums/consent-scope.enum.js';

export class GrantConsentDto {
  @ApiProperty({
    description: 'Public doctor identifier (e.g. DOC-90218471) or doctor ID',
    example: 'DOC-90218471',
  })
  @IsString()
  @IsNotEmpty({ message: 'doctorId or publicDoctorId is required' })
  public doctorId!: string;

  @ApiProperty({
    description: 'List of granular resource scopes granted to the physician',
    enum: ConsentScope,
    isArray: true,
    example: [
      ConsentScope.PATIENT_PROFILE,
      ConsentScope.CONSULTATION_INFO,
      ConsentScope.HEALTH_RECORDS,
    ],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one consent scope must be provided' })
  @IsEnum(ConsentScope, { each: true, message: 'Invalid consent scope provided' })
  public scopes!: ConsentScope[];

  @ApiPropertyOptional({
    description: 'Purpose for which consent is explicitly granted',
    example: 'Comprehensive longitudinal healthcare consultation and review',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  public purpose?: string;

  @ApiPropertyOptional({
    description:
      'Optional expiration timestamp in ISO 8601 format. If omitted, consent remains active until manually revoked.',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'expiresAt must be a valid ISO 8601 datetime string' })
  public expiresAt?: string;
}
