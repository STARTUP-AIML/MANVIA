// ==============================================================================
// MANVIA — Session & Refresh Token Repository
// ==============================================================================
// Phase 4: Data Access for Authentication Sessions and Token Rotation
// ==============================================================================

import { Injectable } from '@nestjs/common';
import type { Session, RefreshToken, User } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type {
  ITransactionalRepository,
  TransactionClient,
} from '../../../database/database.interface.js';
import type { CreateSessionData, CreateRefreshTokenData } from '../auth.interface.js';

@Injectable()
export class SessionRepository implements ITransactionalRepository {
  private tx?: TransactionClient;

  constructor(private readonly prisma: PrismaService) {}

  public withTransaction(tx: TransactionClient): this {
    const clone = new SessionRepository(this.prisma);
    clone.tx = tx;
    return clone as this;
  }

  private get client(): PrismaService | TransactionClient {
    return this.tx ?? this.prisma;
  }

  public async createSession(data: CreateSessionData): Promise<Session> {
    return this.client.session.create({
      data: {
        userId: data.userId,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        deviceType: data.deviceType ?? null,
        deviceName: data.deviceName ?? null,
      },
    });
  }

  public async findSessionById(id: string): Promise<(Session & { user: User }) | null> {
    return this.client.session.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  public async updateSessionActivity(id: string): Promise<Session> {
    return this.client.session.update({
      where: { id },
      data: { lastActivityAt: new Date() },
    });
  }

  public async revokeSession(id: string): Promise<Session> {
    return this.client.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeAllUserSessions(userId: string): Promise<number> {
    const result = await this.client.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  public async findActiveSessionsByUserId(userId: string): Promise<Session[]> {
    return this.client.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.client.refreshToken.create({
      data: {
        sessionId: data.sessionId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        expiresAt: data.expiresAt,
      },
    });
  }

  public async findRefreshTokenByHash(
    tokenHash: string,
  ): Promise<(RefreshToken & { session: Session & { user: User } }) | null> {
    return this.client.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: { user: true },
        },
      },
    });
  }

  public async markRefreshTokenUsed(id: string): Promise<RefreshToken> {
    return this.client.refreshToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  public async revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.client.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  public async revokeTokenFamily(familyId: string): Promise<number> {
    const result = await this.client.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}
