// ==============================================================================
// MANVIA — Authentication Service
// ==============================================================================
// Phase 4: Core Authentication Orchestration
// ==============================================================================

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User, Role } from '@prisma/client';
import { UserService } from '../../identity/user.service.js';
import { PasswordCredentialRepository } from '../repositories/password-credential.repository.js';
import { PasswordService } from './password.service.js';
import { TokenService } from './token.service.js';
import { SessionService } from './session.service.js';
import { AuthAuditService, AUTH_AUDIT_ACTIONS } from './auth-audit.service.js';
import { PrismaService } from '../../../database/prisma.service.js';
import type { RegisterDto } from '../dto/register.dto.js';
import type { LoginDto } from '../dto/login.dto.js';
import type { RefreshTokenDto } from '../dto/refresh-token.dto.js';
import type { ChangePasswordDto } from '../dto/change-password.dto.js';
import type { AuthResponseDto } from '../dto/auth-response.dto.js';
import type { UserResponseDto } from '../dto/user-response.dto.js';
import type { TokenRefreshResponseDto } from '../dto/token-refresh-response.dto.js';
import type { ClientMetadata } from '../auth.interface.js';
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from '../../../common/errors/app-error.js';

// Pre-computed dummy Argon2id hash to mitigate user enumeration through timing disparity
const TIMING_SAFE_DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$dHVtbXlzYWx0MTIzNDU2Nw$9/04d7c2Yy/J3/7d2f9g0h1i2j3k4l5m6n7o8p9q0r';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly passwordCredentialRepo: PasswordCredentialRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuthAuditService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Registers a new User identity with an isolated PasswordCredential.
   * Multi-table writes (User + PasswordCredential + Session + RefreshToken) are executed
   * within an atomic database transaction.
   */
  public async register(dto: RegisterDto, metadata?: ClientMetadata): Promise<AuthResponseDto> {
    // 1. Enforce password complexity policy
    const policyResult = this.passwordService.validatePasswordPolicy(dto.password);
    if (!policyResult.isValid) {
      throw new ValidationError('Password does not satisfy security requirements', {
        violations: policyResult.errors,
      });
    }

    // 2. Hash password inside authentication boundary
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    const initialRole: Role = dto.role ?? 'PATIENT';
    const email = dto.email.toLowerCase().trim();
    const phone = dto.phone?.trim() ?? null;

    try {
      // 3. Execute atomic transaction for User and Credential persistence
      const { user, session, refreshToken } = await this.prisma.executeTransaction(async (tx) => {
        const userRepo = this.userService;
        const credRepo = this.passwordCredentialRepo.withTransaction(tx);

        // Create central User identity
        const createdUser = await userRepo.createUser(
          {
            email,
            phone,
            roles: [initialRole],
            status: 'ACTIVE',
          },
          tx,
        );

        // Create separate password credential record
        await credRepo.create({
          userId: createdUser.id,
          passwordHash,
        });

        // Create initial session & refresh token
        const sessionData = await this.sessionService.createSession(
          {
            userId: createdUser.id,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
            deviceType: metadata?.deviceType,
            deviceName: metadata?.deviceName,
          },
          tx,
        );

        return {
          user: createdUser,
          session: sessionData.session,
          refreshToken: sessionData.refreshToken,
        };
      });

      // 4. Generate short-lived access JWT
      const { accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
        userId: user.id,
        sessionId: session.id,
        roles: user.roles,
        activeRole: user.roles[0] ?? initialRole,
      });

      // 5. Emit registration audit event
      await this.auditService.logEvent({
        actorUserId: user.id,
        action: AUTH_AUDIT_ACTIONS.REGISTER,
        resourceType: 'user',
        resourceId: user.id,
        status: 'SUCCESS',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      });

      return {
        user: this.mapToUserResponseDto(user),
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: expiresInSeconds,
      };
    } catch (err) {
      // Handle database-level uniqueness violation safely without leaking internals
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const metaStr = JSON.stringify(err.meta ?? '').toLowerCase();
        if (metaStr.includes('phone')) {
          throw new ConflictError('An account with this phone number already exists');
        }
        throw new ConflictError('An account with this email address already exists');
      }

      throw err;
    }
  }

  /**
   * Authenticates user via email and password credentials.
   * Constant-time verification is performed regardless of user presence to prevent timing leaks.
   */
  public async login(dto: LoginDto, metadata?: ClientMetadata): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.userService.findByEmail(email);

    // If user not found, perform dummy password verification to maintain consistent timing
    if (!user) {
      await this.passwordService.verifyPassword(dto.password, TIMING_SAFE_DUMMY_HASH);
      await this.auditService.logEvent({
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILURE,
        resourceType: 'auth',
        status: 'FAILURE',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        details: { reason: 'User not found' },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Account status check (active, locked, suspended)
    this.userService.validateAccountStatus(user);

    // Fetch separate password credential
    const credential = await this.passwordCredentialRepo.findByUserId(user.id);
    if (!credential) {
      await this.passwordService.verifyPassword(dto.password, TIMING_SAFE_DUMMY_HASH);
      await this.auditService.logEvent({
        actorUserId: user.id,
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILURE,
        resourceType: 'auth',
        resourceId: user.id,
        status: 'FAILURE',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        details: { reason: 'No password credential found' },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password against cryptographic Argon2id hash
    const isValid = await this.passwordService.verifyPassword(
      dto.password,
      credential.passwordHash,
    );

    if (!isValid) {
      await this.userService.handleFailedLogin(user);
      await this.auditService.logEvent({
        actorUserId: user.id,
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILURE,
        resourceType: 'auth',
        resourceId: user.id,
        status: 'FAILURE',
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        details: { reason: 'Password mismatch' },
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    // Reset login failures on success
    await this.userService.handleSuccessfulLogin(user);

    // Create session & refresh token
    const { session, refreshToken } = await this.sessionService.createSession({
      userId: user.id,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      deviceType: metadata?.deviceType,
      deviceName: metadata?.deviceName,
    });

    const activeRole = user.roles[0] ?? 'PATIENT';
    const { accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      userId: user.id,
      sessionId: session.id,
      roles: user.roles,
      activeRole,
    });

    await this.auditService.logEvent({
      actorUserId: user.id,
      action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
      resourceType: 'session',
      resourceId: session.id,
      status: 'SUCCESS',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });

    return {
      user: this.mapToUserResponseDto(user),
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Refreshes an authenticated session by rotating the refresh token.
   */
  public async refresh(
    dto: RefreshTokenDto,
    metadata?: ClientMetadata,
  ): Promise<TokenRefreshResponseDto> {
    const { session, user, newRefreshToken } = await this.sessionService.rotateRefreshToken(
      dto.refreshToken,
      metadata,
    );

    const activeRole = user.roles[0] ?? 'PATIENT';
    const { accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      userId: user.id,
      sessionId: session.id,
      roles: user.roles,
      activeRole,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
    };
  }

  /**
   * Logs out the user by explicitly revoking the current session.
   */
  public async logout(sessionId: string, userId: string, metadata?: ClientMetadata): Promise<void> {
    await this.sessionService.revokeSession(sessionId, userId);
    await this.auditService.logEvent({
      actorUserId: userId,
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      resourceType: 'session',
      resourceId: sessionId,
      status: 'SUCCESS',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Updates account password after validating the existing credential.
   */
  public async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    metadata?: ClientMetadata,
  ): Promise<void> {
    const credential = await this.passwordCredentialRepo.findByUserId(userId);
    if (!credential) {
      throw new UnauthorizedError('No password credential configured for account');
    }

    const isCurrentValid = await this.passwordService.verifyPassword(
      dto.currentPassword,
      credential.passwordHash,
    );

    if (!isCurrentValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const policy = this.passwordService.validatePasswordPolicy(dto.newPassword);
    if (!policy.isValid) {
      throw new ValidationError('New password does not satisfy security requirements', {
        violations: policy.errors,
      });
    }

    const newHash = await this.passwordService.hashPassword(dto.newPassword);
    await this.passwordCredentialRepo.updatePasswordHash(userId, newHash);

    // Invalidate existing sessions for safety
    await this.sessionService.revokeAllUserSessions(userId);

    await this.auditService.logEvent({
      actorUserId: userId,
      action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGE,
      resourceType: 'user',
      resourceId: userId,
      status: 'SUCCESS',
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    });
  }

  /**
   * Maps Prisma User model to sanitized UserResponseDto (zero credential leaks).
   */
  public mapToUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      status: user.status,
      roles: user.roles,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
