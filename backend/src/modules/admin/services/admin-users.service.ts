import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import { NotFoundError, ConflictError } from '../../../common/errors/app-error.js';
import type { AdminUserQueryDto } from '../dto/admin-user-query.dto.js';
import type { UpdateUserStatusDto } from '../dto/update-user-status.dto.js';
import { AdminAuditService } from './admin-audit.service.js';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  public async listUsers(query: AdminUserQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.roles = { has: query.role };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          phone: true,
          emailVerified: true,
          phoneVerified: true,
          status: true,
          roles: true,
          failedLoginAttempts: true,
          lockoutUntil: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          patientProfile: {
            select: {
              id: true,
              publicPatientId: true,
              displayName: true,
            },
          },
          doctorProfile: {
            select: {
              id: true,
              publicDoctorId: true,
              displayName: true,
              verificationStatus: true,
            },
          },
          sessions: {
            select: { id: true },
            where: {
              revokedAt: null,
              expiresAt: { gt: new Date() },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const { sessions, ...rest } = u;
      return {
        ...rest,
        activeSessionCount: sessions.length,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        status: true,
        roles: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        patientProfile: {
          select: {
            id: true,
            publicPatientId: true,
            displayName: true,
            gender: true,
            biologicalSex: true,
          },
        },
        doctorProfile: {
          select: {
            id: true,
            publicDoctorId: true,
            displayName: true,
            verificationStatus: true,
          },
        },
        _count: {
          select: {
            sessions: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    return user;
  }

  public async updateUserStatus(userId: string, dto: UpdateUserStatusDto, adminUserId: string) {
    if (userId === adminUserId && dto.status !== 'ACTIVE') {
      throw new ConflictError(
        'Administrators cannot suspend, lock, or deactivate their own administrative accounts',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, roles: true },
    });

    if (!existingUser) {
      throw new NotFoundError(`User with id ${userId} not found`);
    }

    const previousStatus = existingUser.status;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          status: dto.status,
          ...(dto.status === 'LOCKED'
            ? { lockoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }
            : {}),
        },
      });

      // If user is suspended, locked, or deactivated, revoke all active sessions immediately
      if (['SUSPENDED', 'LOCKED', 'DEACTIVATED'].includes(dto.status)) {
        await tx.session.updateMany({
          where: {
            userId,
            revokedAt: null,
          },
          data: {
            revokedAt: new Date(),
            expiresAt: new Date(),
          },
        });
      }
    });

    // Record audit event
    await this.auditService.recordAdminAction({
      actorUserId: adminUserId,
      action: 'ADMIN.USER_STATUS_UPDATED',
      resourceType: 'USER',
      resourceId: userId,
      details: {
        targetUserEmail: existingUser.email,
        previousStatus,
        newStatus: dto.status,
        reason: dto.reason,
      },
      status: 'SUCCESS',
    });

    return {
      userId,
      previousStatus,
      status: dto.status,
      reason: dto.reason,
      updatedAt: new Date().toISOString(),
    };
  }
}
