// ==============================================================================
// MANVIA — User Identity Repository
// ==============================================================================
// Phase 4: PostgreSQL + Prisma Data Access for Central User Entity
// Adheres strictly to ITransactionalRepository pattern.
// ==============================================================================

import { Injectable } from '@nestjs/common';
import type { User, UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type {
  ITransactionalRepository,
  TransactionClient,
} from '../../database/database.interface.js';
import type { CreateUserData, IUserRepository } from './identity.interface.js';

@Injectable()
export class UserRepository implements IUserRepository, ITransactionalRepository {
  private tx?: TransactionClient;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Spawns a transaction-bound repository instance.
   */
  public withTransaction(tx: TransactionClient): this {
    const clone = new UserRepository(this.prisma);
    clone.tx = tx;
    return clone as this;
  }

  private get client(): PrismaService | TransactionClient {
    return this.tx ?? this.prisma;
  }

  public async create(data: CreateUserData): Promise<User> {
    return this.client.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        phone: data.phone ? data.phone.trim() : null,
        emailVerified: data.emailVerified ?? false,
        phoneVerified: data.phoneVerified ?? false,
        status: data.status ?? 'ACTIVE',
        roles: data.roles ?? ['PATIENT'],
      },
    });
  }

  public async findById(id: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { id },
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  public async findByPhone(phone: string): Promise<User | null> {
    return this.client.user.findUnique({
      where: { phone: phone.trim() },
    });
  }

  public async updateStatus(id: string, status: UserStatus): Promise<User> {
    return this.client.user.update({
      where: { id },
      data: { status },
    });
  }

  public async recordFailedLogin(
    id: string,
    failedAttempts: number,
    lockoutUntil?: Date | null,
  ): Promise<User> {
    return this.client.user.update({
      where: { id },
      data: {
        failedLoginAttempts: failedAttempts,
        lockoutUntil: lockoutUntil ?? null,
      },
    });
  }

  public async recordSuccessfulLogin(id: string): Promise<User> {
    return this.client.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
        lastLoginAt: new Date(),
      },
    });
  }
}
