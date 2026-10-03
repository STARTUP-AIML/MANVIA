// ==============================================================================
// MANVIA — Register DTO
// ==============================================================================
// Phase 4: Validated Payload for Account Registration
// ==============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({
    description: 'Unique user email address',
    example: 'user@example.com',
    maxLength: 320,
  })
  @IsEmail({}, { message: 'Must provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(320, { message: 'Email cannot exceed 320 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @ApiProperty({
    description:
      'Account password (min 12 characters, including uppercase, lowercase, number, and special character)',
    example: 'Str0ngP@ssw0rd!2026',
    minLength: 12,
    maxLength: 128,
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,128}$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;

  @ApiPropertyOptional({
    description: 'Optional contact phone number in E.164 international format',
    example: '+14155552671',
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be formatted in E.164 format (e.g. +14155552671)',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phone?: string;

  @ApiPropertyOptional({
    description: 'Initial role identity (defaults to PATIENT)',
    enum: Role,
    default: Role.PATIENT,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be PATIENT, DOCTOR, or ADMIN' })
  role?: Role;
}
