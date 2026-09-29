// ==============================================================================
// MANVIA — Switch Role Request DTO
// ==============================================================================
// Phase 5: Active Role Switching Request
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class SwitchRoleDto {
  @ApiProperty({
    enum: Role,
    example: 'DOCTOR',
    description: 'The target role to switch to as active role',
  })
  @IsNotEmpty({ message: 'Role must not be empty' })
  @IsEnum(Role, { message: 'Invalid role specified' })
  public role!: Role;
}
