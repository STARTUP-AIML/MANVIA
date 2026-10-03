// ==============================================================================
// MANVIA — Token Refresh Response DTO
// ==============================================================================
// Phase 4: Rotated Access and Refresh Credentials
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';

export class TokenRefreshResponseDto {
  @ApiProperty({
    description: 'Newly minted short-lived JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Rotated opaque refresh token',
    example: 'e4f07384d113edec49eaa6238ad5ff1111111111111111111111111111111111',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'HTTP Authorization header token scheme',
    example: 'Bearer',
  })
  tokenType!: string;

  @ApiProperty({
    description: 'Access token validity duration in seconds',
    example: 900,
  })
  expiresIn!: number;
}
