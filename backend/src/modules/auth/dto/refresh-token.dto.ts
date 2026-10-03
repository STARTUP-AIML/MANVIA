// ==============================================================================
// MANVIA — Refresh Token DTO
// ==============================================================================
// Phase 4: Token Rotation Request Payload
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Cryptographically opaque refresh token previously issued to client',
    example: 'd3b07384d113edec49eaa6238ad5ff0000000000000000000000000000000000',
  })
  @IsString({ message: 'Refresh token must be a string' })
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}
