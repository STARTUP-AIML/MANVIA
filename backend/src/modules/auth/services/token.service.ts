// ==============================================================================
// MANVIA — Token Service
// ==============================================================================
// Phase 4: Access JWT Minting/Verification & Cryptographic Refresh Token Generation
// ==============================================================================

import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ConfigService } from '../../../config/config.service.js';
import type { JwtPayload } from '../auth.interface.js';
import type { Role } from '@prisma/client';
import { UnauthorizedError } from '../../../common/errors/app-error.js';

@Injectable()
export class TokenService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a signed access JWT for authenticated requests.
   */
  public generateAccessToken(params: {
    userId: string;
    sessionId: string;
    roles: Role[];
    activeRole: Role;
  }): { accessToken: string; expiresInSeconds: number } {
    const jti = crypto.randomUUID();
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: params.userId,
      sessionId: params.sessionId,
      roles: params.roles,
      activeRole: params.activeRole,
      jti,
    };

    const expiresIn = this.configService.jwtAccessExpiration;
    const token = jwt.sign(payload, this.configService.jwtSecret, {
      expiresIn,
    } as unknown as jwt.SignOptions);
    const expiresInSeconds = this.parseDurationToSeconds(expiresIn);

    return {
      accessToken: token,
      expiresInSeconds,
    };
  }

  /**
   * Validates and decodes an incoming access JWT.
   * Throws UnauthorizedError if expired or malformed.
   */
  public verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.configService.jwtSecret);
      return decoded as JwtPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token has expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  /**
   * Generates a cryptographically strong, opaque 256-bit random refresh token.
   */
  public generateOpaqueRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculates deterministic SHA-256 hash of a raw refresh token for safe storage and indexing.
   */
  public hashRefreshToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Calculates the expiration Date for a new refresh token based on config.
   */
  public getRefreshTokenExpiryDate(): Date {
    const duration = this.configService.jwtRefreshExpiration;
    const seconds = this.parseDurationToSeconds(duration);
    return new Date(Date.now() + seconds * 1000);
  }

  /**
   * Helper parsing duration strings (e.g. '15m', '7d', '24h') to seconds.
   */
  public parseDurationToSeconds(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match || !match[1] || !match[2]) {
      return 900; // default 15 minutes in seconds
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}
