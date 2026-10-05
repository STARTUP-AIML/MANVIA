import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
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
import { PrismaDoctorVerificationRepository } from './repositories/prisma-verification.repository.js';

import { S3StorageService } from '../../common/storage/s3-storage.service.js';
import { ConfigService } from '../../config/config.service.js';

@Module({
  imports: [DatabaseModule, DoctorsModule],
  controllers: [DoctorVerificationController, AdminVerificationController],
  providers: [
    DoctorVerificationService,
    AdminVerificationService,
    AdminAuthGuard,
    StorageService,
    S3StorageService,
    {
      provide: STORAGE_SERVICE,
      useFactory: (config: ConfigService, s3: S3StorageService, local: StorageService) => {
        const driver = (config.raw.STORAGE_DRIVER || 'local').toLowerCase();
        if (driver === 's3' || driver === 'minio' || driver === 'r2' || driver === 'gcs') {
          return s3;
        }
        return local;
      },
      inject: [ConfigService, S3StorageService, StorageService],
    },
    {
      provide: VERIFICATION_AUDIT_SERVICE,
      useClass: VerificationAuditService,
    },
    {
      provide: DOCTOR_VERIFICATION_REPOSITORY,
      useClass: PrismaDoctorVerificationRepository,
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
