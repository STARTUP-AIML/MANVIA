// ==============================================================================
// MANVIA — Session Service
// ==============================================================================
// Phase 4: Session Lifecycle Management & Refresh Token Rotation with Breach Detection
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import crypto from 'node:crypto';
import type { Session, User } from '@prisma/client';
import { SessionRepository } from '../repositories/session.repository.js';
import { TokenService } from './token.service.js';
import { AuthAuditService, AUTH_AUDIT_ACTIONS } from './auth-audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import type { ClientMetadata } from '../auth.interface.js';
import { UnauthorizedError } from '../../../common/errors/app-error.js';
import type { TransactionClient } from '../../../database/database.interface.js';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuthAuditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Establishes a new authenticated session for a user along with an initial refresh token.
   */
  public async createSession(
    params: {
      userId: string;
      ipAddress?: string | undefined;
      userAgent?: string | undefined;
      deviceType?: string | undefined;
      deviceName?: string | undefined;
    },
    tx?: TransactionClient,
  ): Promise<{ session: Session; refreshToken: string }> {
    const sessionRepo = tx ? this.sessionRepository.withTransaction(tx) : this.sessionRepository;
    const expiresAt = this.tokenService.getRefreshTokenExpiryDate();

    const session = await sessionRepo.createSession({
      userId: params.userId,
      expiresAt,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceType: params.deviceType,
      deviceName: params.deviceName,
    });

    const rawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const familyId = crypto.randomUUID();

    await sessionRepo.createRefreshToken({
      sessionId: session.id,
      tokenHash,
      familyId,
      expiresAt,
    });

    return { session, refreshToken: rawRefreshToken };
  }

  /**
   * Validates whether a session ID represents an active, non-expired, non-revoked session.
   */
  public async validateSession(
    sessionId: string,
  ): Promise<{ isValid: boolean; session?: Session & { user: User } }> {
    const session = await this.sessionRepository.findSessionById(sessionId);

    if (!session) {
      return { isValid: false };
    }

    if (session.revokedAt !== null) {
      return { isValid: false };
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return { isValid: false };
    }

    // Touch session activity asynchronously
    this.sessionRepository.updateSessionActivity(sessionId).catch(() => undefined);

    return { isValid: true, session };
  }

  /**
   * Rotates a refresh token following ADR-009 token family tracking.
   * If a previously used token is submitted, the entire token family is revoked to mitigate breach.
   */
  public async rotateRefreshToken(
    rawRefreshToken: string,
    metadata?: ClientMetadata,
  ): Promise<{ session: Session; user: User; newRefreshToken: string }> {
    const tokenHash = this.tokenService.hashRefreshToken(rawRefreshToken);
    const existingToken = await this.sessionRepository.findRefreshTokenByHash(tokenHash);

    if (!existingToken) {
      this.logger.warn('Refresh attempt with non-existent token hash.');
      throw new UnauthorizedError('Invalid refresh token');
    }

    const { session } = existingToken;

    // Breach detection: If token was already used, trigger family revocation immediately
    if (existingToken.usedAt !== null) {
      this.logger.error(
        `[SECURITY ALERT] Replay attack detected for token family ${existingToken.familyId} on session ${session.id}! Revoking family.`,
      );

      await this.sessionRepository.revokeTokenFamily(existingToken.familyId);
      await this.sessionRepository.revokeSession(session.id);

      await this.auditService.logEvent({
        actorUserId: session.userId,
        action: AUTH_AUDIT_ACTIONS.BREACH_ATTEMPT_DETECTED,
        resourceType: 'session',
        resourceId: session.id,
        status: 'FAILURE',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        details: {
          familyId: existingToken.familyId,
          tokenId: existingToken.id,
          reason: 'Token reuse detected',
        },
      });

      throw new UnauthorizedError(
        'Security alert: Invalid token reuse detected. Session has been revoked.',
      );
    }

    // Check if token or session is revoked or expired
    if (existingToken.revokedAt !== null || session.revokedAt !== null) {
      throw new UnauthorizedError('Authentication session has been revoked');
    }

    if (existingToken.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedError('User account is inactive or suspended');
    }

    // Generate new credentials
    const newRawRefreshToken = this.tokenService.generateOpaqueRefreshToken();
    const newTokenHash = this.tokenService.hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = this.tokenService.getRefreshTokenExpiryDate();

    // Atomic rotation
    await this.prisma.executeTransaction(async (tx) => {
      const txSessionRepo = this.sessionRepository.withTransaction(tx);
      await txSessionRepo.markRefreshTokenUsed(existingToken.id);
      await txSessionRepo.createRefreshToken({
        sessionId: session.id,
        tokenHash: newTokenHash,
        familyId: existingToken.familyId,
        expiresAt: newExpiresAt,
      });
      await txSessionRepo.updateSessionActivity(session.id);
    });

    await this.auditService.logEvent({
      actorUserId: session.userId,
      action: AUTH_AUDIT_ACTIONS.TOKEN_REFRESH,
      resourceType: 'session',
      resourceId: session.id,
      status: 'SUCCESS',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      session,
      user: session.user,
      newRefreshToken: newRawRefreshToken,
    };
  }

  /**
   * Revokes a specific authenticated session.
   */
  public async revokeSession(sessionId: string, actorUserId?: string): Promise<void> {
    await this.sessionRepository.revokeSession(sessionId);
    await this.auditService.logEvent({
      actorUserId,
      action: AUTH_AUDIT_ACTIONS.SESSION_REVOKED,
      resourceType: 'session',
      resourceId: sessionId,
      status: 'SUCCESS',
    });
  }

  /**
   * Revokes all active sessions for a given user (e.g. on password reset or account security event).
   */
  public async revokeAllUserSessions(userId: string): Promise<number> {
    const count = await this.sessionRepository.revokeAllUserSessions(userId);
    this.logger.log(`Revoked ${count} sessions for user ${userId}.`);
    return count;
  }

  /**
   * Lists active sessions for a user.
   */
  public async getActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.findActiveSessionsByUserId(userId);
  }
}
