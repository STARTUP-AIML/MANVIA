import { Module } from '@nestjs/common';
import { DoctorsController } from './controllers/doctors.controller.js';
import { DoctorsService } from './services/doctors.service.js';
import { TaxonomyService } from './services/taxonomy.service.js';
import { DoctorAuthGuard } from './guards/doctor-auth.guard.js';
import { DOCTORS_REPOSITORY } from './interfaces/doctor-repository.interface.js';
import { InMemoryDoctorsRepository } from './repositories/in-memory-doctors.repository.js';

@Module({
  controllers: [DoctorsController],
  providers: [
    DoctorsService,
    TaxonomyService,
    DoctorAuthGuard,
    {
      provide: DOCTORS_REPOSITORY,
      useClass: InMemoryDoctorsRepository,
    },
  ],
  exports: [DoctorsService, TaxonomyService, DoctorAuthGuard, DOCTORS_REPOSITORY],
})
export class DoctorsModule {}
