import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { DatabaseModule } from './database/database.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AuthorizationModule } from './modules/authorization/authorization.module.js';
import { PatientModule } from './modules/patient/patient.module.js';
import { AppController } from './app.controller.js';
import { DoctorsModule } from './modules/doctors/doctors.module.js';
import { DoctorVerificationModule } from './modules/doctor-verification/doctor-verification.module.js';
import { DoctorAvailabilityModule } from './modules/doctor-availability/doctor-availability.module.js';
import { CareRelationshipsModule } from './modules/care-relationships/care-relationships.module.js';
import { WellnessModule } from './modules/wellness/wellness.module.js';
import { HealthRecordsModule } from './modules/health-records/health-records.module.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { AIModule } from './modules/ai/ai.module.js';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    DatabaseModule,
    IdentityModule,
    AuthModule,
    AuthorizationModule,
    PatientModule,
    DoctorsModule,
    DoctorVerificationModule,
    DoctorAvailabilityModule,
    CareRelationshipsModule,
    WellnessModule,
    HealthRecordsModule,
    AppointmentsModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
