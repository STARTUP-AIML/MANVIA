import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { AppController } from './app.controller.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { DoctorVerificationModule } from './modules/doctor-verification/doctor-verification.module.js';
import { DoctorAvailabilityModule } from './modules/doctor-availability/doctor-availability.module.js';
import { CareRelationshipsModule } from './modules/care-relationships/care-relationships.module.js';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    DoctorsModule,
    DoctorVerificationModule,
    DoctorAvailabilityModule,
    CareRelationshipsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
