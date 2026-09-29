// ==============================================================================
// MANVIA — Switch Role Response DTO
// ==============================================================================
// Phase 5: Response Contract for Role Switching
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class SwitchRoleResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed access JWT with updated activeRole claim',
  })
  public accessToken!: string;

  @ApiProperty({
    example: 900,
    description: 'Access token expiration in seconds',
  })
  public expiresInSeconds!: number;

  @ApiProperty({
    enum: Role,
    example: 'DOCTOR',
    description: 'The newly active role',
  })
  public activeRole!: Role;

  @ApiProperty({
    enum: Role,
    isArray: true,
    example: ['PATIENT', 'DOCTOR'],
    description: 'All roles assigned to the user',
  })
  public roles!: Role[];

  public static from(data: {
    accessToken: string;
    expiresInSeconds: number;
    activeRole: Role;
    roles: Role[];
  }): SwitchRoleResponseDto {
    const dto = new SwitchRoleResponseDto();
    dto.accessToken = data.accessToken;
    dto.expiresInSeconds = data.expiresInSeconds;
    dto.activeRole = data.activeRole;
    dto.roles = data.roles;
    return dto;
  }
}
