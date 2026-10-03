import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { DoctorAvailabilityController } from './controllers/doctor-availability.controller.js';
import { ConsultationOffersController } from './controllers/consultation-offers.controller.js';
import { PublicDoctorDiscoveryController } from './controllers/public-doctor-discovery.controller.js';
import { AvailabilityValidationService } from './services/availability-validation.service.js';
import { DoctorAvailabilityService } from './services/doctor-availability.service.js';
import { ConsultationOffersService } from './services/consultation-offers.service.js';
import { DOCTOR_AVAILABILITY_REPOSITORY } from './interfaces/availability-repository.interface.js';
import { InMemoryDoctorAvailabilityRepository } from './repositories/in-memory-doctor-availability.repository.js';

@Module({
  imports: [DoctorsModule],
  controllers: [
    DoctorAvailabilityController,
    ConsultationOffersController,
    PublicDoctorDiscoveryController,
  ],
  providers: [
    AvailabilityValidationService,
    DoctorAvailabilityService,
    ConsultationOffersService,
    {
      provide: DOCTOR_AVAILABILITY_REPOSITORY,
      useClass: InMemoryDoctorAvailabilityRepository,
    },
  ],
  exports: [
    DoctorAvailabilityService,
    ConsultationOffersService,
    AvailabilityValidationService,
    DOCTOR_AVAILABILITY_REPOSITORY,
  ],
})
export class DoctorAvailabilityModule {}
