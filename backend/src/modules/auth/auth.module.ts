// ==============================================================================
// MANVIA — Authentication Module
// ==============================================================================
// Phase 4: Identity & Authentication Module Configuration
// ==============================================================================

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ConfigModule } from '../../config/config.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AuthController } from './auth.controller.js';
import { PasswordCredentialRepository } from './repositories/password-credential.repository.js';
import { SessionRepository } from './repositories/session.repository.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { PasswordService } from './services/password.service.js';
import { TokenService } from './services/token.service.js';
import { SessionService } from './services/session.service.js';
import { AuthAuditService } from './services/auth-audit.service.js';
import { AuthService } from './services/auth.service.js';
import { AuthGuard } from './guards/auth.guard.js';

@Module({
  imports: [DatabaseModule, ConfigModule, IdentityModule],
  controllers: [AuthController],
  providers: [
    PasswordCredentialRepository,
    SessionRepository,
    AuditLogRepository,
    PasswordService,
    TokenService,
    SessionService,
    AuthAuditService,
    AuthService,
    AuthGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    SessionService,
    PasswordService,
    AuthAuditService,
    AuthGuard,
    IdentityModule,
  ],
})
export class AuthModule {}
