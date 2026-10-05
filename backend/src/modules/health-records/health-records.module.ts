import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { CareRelationshipsModule } from '../care-relationships/care-relationships.module.js';
import { PatientHealthRecordsController } from './controllers/patient-health-records.controller.js';
import { PatientHealthTimelineController } from './controllers/patient-health-timeline.controller.js';
import { DoctorHealthRecordsController } from './controllers/doctor-health-records.controller.js';
import { HealthRecordsService } from './services/health-records.service.js';
import { HealthTimelineService } from './services/health-timeline.service.js';
import { HealthRecordsAuditService } from './services/health-records-audit.service.js';
import { HealthRecordsStorageService } from './services/health-records-storage.service.js';
import { InMemoryHealthRecordRepository } from './repositories/in-memory-health-record.repository.js';
import { PrismaHealthRecordRepository } from './repositories/prisma-health-record.repository.js';
import { InMemoryHealthTimelineRepository } from './repositories/in-memory-health-timeline.repository.js';
import { PrismaHealthTimelineRepository } from './repositories/prisma-health-timeline.repository.js';
import { HEALTH_RECORD_REPOSITORY } from './interfaces/health-record-repository.interface.js';
import { HEALTH_TIMELINE_REPOSITORY } from './interfaces/health-timeline-repository.interface.js';
import { HEALTH_RECORDS_AUDIT_SERVICE } from './interfaces/health-records-audit-service.interface.js';
import { HEALTH_RECORDS_STORAGE_SERVICE } from './interfaces/health-records-storage-service.interface.js';

import { S3StorageService } from '../../common/storage/s3-storage.service.js';
import { ConfigService } from '../../config/config.service.js';

@Module({
  imports: [DatabaseModule, DoctorsModule, CareRelationshipsModule],
  controllers: [
    PatientHealthRecordsController,
    PatientHealthTimelineController,
    DoctorHealthRecordsController,
  ],
  providers: [
    HealthRecordsService,
    HealthTimelineService,
    HealthRecordsAuditService,
    HealthRecordsStorageService,
    S3StorageService,
    InMemoryHealthRecordRepository,
    PrismaHealthRecordRepository,
    InMemoryHealthTimelineRepository,
    PrismaHealthTimelineRepository,
    {
      provide: HEALTH_RECORD_REPOSITORY,
      useClass: PrismaHealthRecordRepository,
    },
    {
      provide: HEALTH_TIMELINE_REPOSITORY,
      useClass: PrismaHealthTimelineRepository,
    },
    {
      provide: HEALTH_RECORDS_AUDIT_SERVICE,
      useClass: HealthRecordsAuditService,
    },
    {
      provide: HEALTH_RECORDS_STORAGE_SERVICE,
      useFactory: (
        config: ConfigService,
        s3: S3StorageService,
        local: HealthRecordsStorageService,
      ) => {
        const driver = (config.raw.STORAGE_DRIVER || 'local').toLowerCase();
        if (driver === 's3' || driver === 'minio' || driver === 'r2' || driver === 'gcs') {
          return s3;
        }
        return local;
      },
      inject: [ConfigService, S3StorageService, HealthRecordsStorageService],
    },
  ],
  exports: [
    HealthRecordsService,
    HealthTimelineService,
    HEALTH_RECORD_REPOSITORY,
    HEALTH_TIMELINE_REPOSITORY,
    HEALTH_RECORDS_AUDIT_SERVICE,
    HEALTH_RECORDS_STORAGE_SERVICE,
  ],
})
export class HealthRecordsModule {}
