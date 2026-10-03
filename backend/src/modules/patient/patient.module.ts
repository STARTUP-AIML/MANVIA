// ==============================================================================
// MANVIA — Patient Domain Module
// ==============================================================================
// Phase 6: Patient Domain Module Configuration
// ==============================================================================

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { ConfigModule } from '../../config/config.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { PatientProfileRepository } from './repositories/patient-profile.repository.js';
import { PatientService } from './services/patient.service.js';
import { PatientController } from './patient.controller.js';

@Module({
  imports: [DatabaseModule, ConfigModule, IdentityModule, AuthModule, AuthorizationModule],
  controllers: [PatientController],
  providers: [PatientProfileRepository, PatientService],
  exports: [PatientService, PatientProfileRepository],
})
export class PatientModule {}
