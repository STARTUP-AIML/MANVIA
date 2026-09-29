// ==============================================================================
// MANVIA — Authentication Module Interfaces & Types
// ==============================================================================
// Phase 4: Identity & Authentication Foundation Contracts
// ==============================================================================

import type { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  sessionId: string;
  roles: Role[];
  activeRole: Role;
  jti: string;
  iat?: number | undefined;
  exp?: number | undefined;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: Role[];
  activeRole: Role;
  sessionId: string;
}

export interface ClientMetadata {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  deviceType?: string | undefined;
  deviceName?: string | undefined;
}

export interface CreateSessionData {
  userId: string;
  expiresAt: Date;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  deviceType?: string | undefined;
  deviceName?: string | undefined;
}

export interface CreateRefreshTokenData {
  sessionId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

export interface CreateAuditLogData {
  actorUserId?: string | null | undefined;
  action: string;
  resourceType: string;
  resourceId?: string | null | undefined;
  status: 'SUCCESS' | 'FAILURE';
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  details?: Record<string, unknown> | null | undefined;
}
