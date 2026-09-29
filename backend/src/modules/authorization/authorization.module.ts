// ==============================================================================
// MANVIA — Authorization Module
// ==============================================================================
// Phase 5: Authorization & Security Foundation Module Configuration
// ==============================================================================

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { ConfigModule } from '../../config/config.module.js';
import { PermissionService } from './services/permission.service.js';
import { AuthorizationService } from './services/authorization.service.js';
import { RolesGuard } from './guards/roles.guard.js';
import { ResourceOwnerGuard } from './guards/resource-owner.guard.js';
import { PolicyGuard } from './guards/policy.guard.js';
import { AuthorizationController } from './authorization.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, ConfigModule],
  controllers: [AuthorizationController],
  providers: [PermissionService, AuthorizationService, RolesGuard, ResourceOwnerGuard, PolicyGuard],
  exports: [PermissionService, AuthorizationService, RolesGuard, ResourceOwnerGuard, PolicyGuard],
})
export class AuthorizationModule {}
