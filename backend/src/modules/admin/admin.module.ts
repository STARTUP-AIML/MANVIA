import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';

// Guards
import { AdminAuthGuard } from './guards/admin-auth.guard.js';

// Services
import { AdminAuditService } from './services/admin-audit.service.js';
import { AdminUsersService } from './services/admin-users.service.js';
import { AdminOversightService } from './services/admin-oversight.service.js';
import { AdminAISafetyService } from './services/admin-ai-safety.service.js';
import { SystemKillSwitchService } from './services/system-kill-switch.service.js';
import { AdminClinicalIncidentService } from './services/admin-clinical-incident.service.js';

// Controllers
import { AdminUsersController } from './controllers/admin-users.controller.js';
import { AdminOversightController } from './controllers/admin-oversight.controller.js';
import { AdminAuditController } from './controllers/admin-audit.controller.js';
import { AdminAISafetyController } from './controllers/admin-ai-safety.controller.js';
import { AdminSystemController } from './controllers/admin-system.controller.js';
import { AdminClinicalIncidentController } from './controllers/admin-clinical-incident.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    AdminUsersController,
    AdminOversightController,
    AdminAuditController,
    AdminAISafetyController,
    AdminSystemController,
    AdminClinicalIncidentController,
  ],
  providers: [
    AdminAuthGuard,
    AdminAuditService,
    AdminUsersService,
    AdminOversightService,
    AdminAISafetyService,
    SystemKillSwitchService,
    AdminClinicalIncidentService,
  ],
  exports: [
    AdminAuthGuard,
    AdminAuditService,
    AdminUsersService,
    SystemKillSwitchService,
    AdminOversightService,
    AdminAISafetyService,
    AdminClinicalIncidentService,
  ],
})
export class AdminModule {}
