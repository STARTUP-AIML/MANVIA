import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { DoctorsController } from './controllers/doctors.controller.js';
import { DoctorsService } from './services/doctors.service.js';
import { TaxonomyService } from './services/taxonomy.service.js';
import { DoctorAuthGuard } from './guards/doctor-auth.guard.js';
import { DOCTORS_REPOSITORY } from './interfaces/doctor-repository.interface.js';
import { PrismaDoctorsRepository } from './repositories/prisma-doctors.repository.js';

@Module({
  imports: [DatabaseModule],
  controllers: [DoctorsController],
  providers: [
    DoctorsService,
    TaxonomyService,
    DoctorAuthGuard,
    {
      provide: DOCTORS_REPOSITORY,
      useClass: PrismaDoctorsRepository,
    },
  ],
  exports: [DoctorsService, TaxonomyService, DoctorAuthGuard, DOCTORS_REPOSITORY],
})
export class DoctorsModule {}
