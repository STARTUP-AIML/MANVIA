// ==============================================================================
// MANVIA — User Response DTO
// ==============================================================================
// Phase 4: Public Identity Representation (Zero Secret Leakage)
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique internal user identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'User contact phone number',
    example: '+14155552671',
    nullable: true,
  })
  phone!: string | null;

  @ApiProperty({
    description: 'Whether the email address has been verified',
    example: false,
  })
  emailVerified!: boolean;

  @ApiProperty({
    description: 'Whether the phone number has been verified',
    example: false,
  })
  phoneVerified!: boolean;

  @ApiProperty({
    description: 'Current account status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @ApiProperty({
    description: 'Available roles associated with this user identity',
    enum: Role,
    isArray: true,
    example: [Role.PATIENT],
  })
  roles!: Role[];

  @ApiProperty({
    description: 'ISO-8601 record creation timestamp',
    example: '2026-09-29T10:00:00.000Z',
  })
  createdAt!: string;
}
