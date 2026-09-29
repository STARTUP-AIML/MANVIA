import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { CareRelationshipsModule } from '../care-relationships/care-relationships.module.js';
import { PatientWellnessController } from './controllers/patient-wellness.controller.js';
import { DoctorWellnessController } from './controllers/doctor-wellness.controller.js';
import { WellnessService } from './services/wellness.service.js';
import { WellnessAuditService } from './services/wellness-audit.service.js';
import { InMemoryWellnessRepository } from './repositories/in-memory-wellness.repository.js';
import { PrismaWellnessRepository } from './repositories/prisma-wellness.repository.js';
import { WELLNESS_REPOSITORY } from './interfaces/wellness-repository.interface.js';
import { WELLNESS_AUDIT_SERVICE } from './interfaces/wellness-audit-service.interface.js';

@Module({
  imports: [DoctorsModule, CareRelationshipsModule],
  controllers: [PatientWellnessController, DoctorWellnessController],
  providers: [
    WellnessService,
    WellnessAuditService,
    InMemoryWellnessRepository,
    PrismaWellnessRepository,
    {
      provide: WELLNESS_REPOSITORY,
      useClass: InMemoryWellnessRepository,
    },
    {
      provide: WELLNESS_AUDIT_SERVICE,
      useClass: WellnessAuditService,
    },
  ],
  exports: [WellnessService, WELLNESS_REPOSITORY, WELLNESS_AUDIT_SERVICE],
})
export class WellnessModule {}
