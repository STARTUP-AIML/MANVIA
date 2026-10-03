// ==============================================================================
// MANVIA — Password Credential Repository
// ==============================================================================
// Phase 4: Data Access Boundary for Isolated Password Credentials
// ==============================================================================

import { Injectable } from '@nestjs/common';
import type { PasswordCredential } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  ITransactionalRepository,
  TransactionClient,
} from '../../../database/database.interface.js';

@Injectable()
export class PasswordCredentialRepository implements ITransactionalRepository {
  private tx?: TransactionClient;

  constructor(private readonly prisma: PrismaService) {}

  public withTransaction(tx: TransactionClient): this {
    const clone = new PasswordCredentialRepository(this.prisma);
    clone.tx = tx;
    return clone as this;
  }

  private get client(): PrismaService | TransactionClient {
    return this.tx ?? this.prisma;
  }

  public async create(data: { userId: string; passwordHash: string }): Promise<PasswordCredential> {
    return this.client.passwordCredential.create({
      data: {
        userId: data.userId,
        passwordHash: data.passwordHash,
      },
    });
  }

  public async findByUserId(userId: string): Promise<PasswordCredential | null> {
    return this.client.passwordCredential.findUnique({
      where: { userId },
    });
  }

  public async updatePasswordHash(
    userId: string,
    passwordHash: string,
  ): Promise<PasswordCredential> {
    return this.client.passwordCredential.update({
      where: { userId },
      data: { passwordHash },
    });
  }

  public async deleteByUserId(userId: string): Promise<boolean> {
    const result = await this.client.passwordCredential.deleteMany({
      where: { userId },
    });
    return result.count > 0;
  }
}
