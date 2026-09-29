import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { DoctorVerificationController } from './controllers/doctor-verification.controller.js';
import { AdminVerificationController } from './controllers/admin-verification.controller.js';
import { DoctorVerificationService } from './services/doctor-verification.service.js';
import { AdminVerificationService } from './services/admin-verification.service.js';
import { StorageService, STORAGE_SERVICE } from './services/storage.service.js';
import { VerificationAuditService } from './services/verification-audit.service.js';
import { VERIFICATION_AUDIT_SERVICE } from './interfaces/audit-service.interface.js';
import { AdminAuthGuard } from './guards/admin-auth.guard.js';
import { DOCTOR_VERIFICATION_REPOSITORY } from './interfaces/verification-repository.interface.js';
import { InMemoryDoctorVerificationRepository } from './repositories/in-memory-verification.repository.js';

@Module({
  imports: [DoctorsModule],
  controllers: [DoctorVerificationController, AdminVerificationController],
  providers: [
    DoctorVerificationService,
    AdminVerificationService,
    AdminAuthGuard,
    {
      provide: STORAGE_SERVICE,
      useClass: StorageService,
    },
    {
      provide: VERIFICATION_AUDIT_SERVICE,
      useClass: VerificationAuditService,
    },
    {
      provide: DOCTOR_VERIFICATION_REPOSITORY,
      useClass: InMemoryDoctorVerificationRepository,
    },
  ],
  exports: [
    DoctorVerificationService,
    AdminVerificationService,
    AdminAuthGuard,
    DOCTOR_VERIFICATION_REPOSITORY,
    STORAGE_SERVICE,
    VERIFICATION_AUDIT_SERVICE,
  ],
})
export class DoctorVerificationModule {}
