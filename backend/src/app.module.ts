import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { AppController } from './app.controller.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { DoctorVerificationModule } from './modules/doctor-verification/doctor-verification.module.js';
import { DoctorAvailabilityModule } from './modules/doctor-availability/doctor-availability.module.js';
import { CareRelationshipsModule } from './modules/care-relationships/care-relationships.module.js';
import { WellnessModule } from './modules/wellness/wellness.module.js';
import { HealthRecordsModule } from './modules/health-records/health-records.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    DoctorsModule,
    DoctorVerificationModule,
    DoctorAvailabilityModule,
    CareRelationshipsModule,
    WellnessModule,
    HealthRecordsModule,
    AppointmentsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
