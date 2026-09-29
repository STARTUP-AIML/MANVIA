// ==============================================================================
// MANVIA — Identity Module
// ==============================================================================
// Phase 4: Central User Identity Boundary
// ==============================================================================

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [UserRepository, UserService],
  exports: [UserRepository, UserService],
})
export class IdentityModule {}
