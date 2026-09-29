// ==============================================================================
// MANVIA — User Identity Service
// ==============================================================================
// Phase 4: Business Logic for User Lifecycle & Identity State
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import type { User, UserStatus } from '@prisma/client';
import { UserRepository } from './user.repository.js';
import type { CreateUserData } from './identity.interface.js';
import { UnauthorizedError } from '../../common/errors/app-error.js';
import type { TransactionClient } from '../../database/database.interface.js';

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  public async createUser(data: CreateUserData, tx?: TransactionClient): Promise<User> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    return repo.create(data);
  }

  public async findById(id: string, tx?: TransactionClient): Promise<User | null> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    return repo.findById(id);
  }

  public async findByEmail(email: string, tx?: TransactionClient): Promise<User | null> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    return repo.findByEmail(email);
  }

  public async findByPhone(phone: string, tx?: TransactionClient): Promise<User | null> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    return repo.findByPhone(phone);
  }

  public async updateStatus(id: string, status: UserStatus, tx?: TransactionClient): Promise<User> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    return repo.updateStatus(id, status);
  }

  /**
   * Verifies that the user account is active and not locked or suspended.
   * Throws UnauthorizedError with secure, non-leaking message if inactive.
   */
  public validateAccountStatus(user: User): void {
    if (user.status === 'DEACTIVATED') {
      throw new UnauthorizedError('Account is deactivated');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Account is suspended');
    }

    if (user.status === 'LOCKED' || (user.lockoutUntil && user.lockoutUntil > new Date())) {
      throw new UnauthorizedError(
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
      );
    }
  }

  /**
   * Records a failed login attempt and applies progressive account lockout if threshold is exceeded.
   */
  public async handleFailedLogin(
    user: User,
    tx?: TransactionClient,
  ): Promise<{ isLocked: boolean; lockoutUntil?: Date | undefined }> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    const nextAttempts = user.failedLoginAttempts + 1;

    let lockoutUntil: Date | null = null;
    let isLocked = false;

    if (nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      isLocked = true;
      this.logger.warn(
        `User ${user.id} locked out until ${lockoutUntil.toISOString()} after ${nextAttempts} failed attempts.`,
      );
    }

    await repo.recordFailedLogin(user.id, nextAttempts, lockoutUntil);
    return { isLocked, lockoutUntil: lockoutUntil ?? undefined };
  }

  /**
   * Resets login failure counters and updates last activity on successful authentication.
   */
  public async handleSuccessfulLogin(user: User, tx?: TransactionClient): Promise<void> {
    const repo = tx ? this.userRepository.withTransaction(tx) : this.userRepository;
    await repo.recordSuccessfulLogin(user.id);
  }
}
