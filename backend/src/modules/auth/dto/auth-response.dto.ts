// ==============================================================================
// MANVIA — Authentication Response DTO
// ==============================================================================
// Phase 4: Authenticated Session Credentials & Identity Payload
// ==============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authenticated user profile details',
    type: () => UserResponseDto,
  })
  user!: UserResponseDto;

  @ApiProperty({
    description: 'Short-lived JWT access token for API requests (15 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Long-lived opaque cryptographically random refresh token',
    example: 'd3b07384d113edec49eaa6238ad5ff0000000000000000000000000000000000',
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
