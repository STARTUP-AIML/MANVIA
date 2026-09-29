// ==============================================================================
// MANVIA — Login DTO
// ==============================================================================
// Phase 4: Validated Credentials for Account Authentication
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'Registered user email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Must provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(320, { message: 'Email cannot exceed 320 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email!: string;

  @ApiProperty({
    description: 'Account password',
    example: 'Str0ngP@ssw0rd!2026',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
