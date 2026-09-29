// ==============================================================================
// MANVIA — Identity Domain Contracts & Types
// ==============================================================================
// Phase 4: Central User Identity Foundation
// ==============================================================================

import type { User, UserStatus, Role } from '@prisma/client';

export interface CreateUserData {
  email: string;
  phone?: string | null | undefined;
  emailVerified?: boolean | undefined;
  phoneVerified?: boolean | undefined;
  status?: UserStatus | undefined;
  roles?: Role[] | undefined;
}

export interface UpdateUserData {
  email?: string | undefined;
  phone?: string | null | undefined;
  emailVerified?: boolean | undefined;
  phoneVerified?: boolean | undefined;
  status?: UserStatus | undefined;
  roles?: Role[] | undefined;
}

export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  updateStatus(id: string, status: UserStatus): Promise<User>;
  recordFailedLogin(
    id: string,
    failedAttempts: number,
    lockoutUntil?: Date | null | undefined,
  ): Promise<User>;
  recordSuccessfulLogin(id: string): Promise<User>;
}
