import { Module } from '@nestjs/common';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { CareRelationshipsModule } from '../care-relationships/care-relationships.module.js';
import { DoctorAvailabilityModule } from '../doctor-availability/doctor-availability.module.js';
import { PatientAppointmentsController } from './controllers/patient-appointments.controller.js';
import { DoctorAppointmentsController } from './controllers/doctor-appointments.controller.js';
import { AppointmentsService } from './services/appointments.service.js';
import { PreConsultationService } from './services/pre-consultation.service.js';
import { AppointmentStateMachineService } from './services/appointment-state-machine.service.js';
import { AppointmentAuditService } from './services/appointment-audit.service.js';
import { InMemoryAppointmentRepository } from './repositories/in-memory-appointment.repository.js';
import { PrismaAppointmentRepository } from './repositories/prisma-appointment.repository.js';
import { APPOINTMENT_REPOSITORY } from './interfaces/appointment-repository.interface.js';
import { APPOINTMENT_AUDIT_SERVICE } from './interfaces/appointment-audit-service.interface.js';

@Module({
  imports: [DoctorsModule, CareRelationshipsModule, DoctorAvailabilityModule],
  controllers: [PatientAppointmentsController, DoctorAppointmentsController],
  providers: [
    AppointmentsService,
    PreConsultationService,
    AppointmentStateMachineService,
    AppointmentAuditService,
    InMemoryAppointmentRepository,
    PrismaAppointmentRepository,
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: InMemoryAppointmentRepository,
    },
    {
      provide: APPOINTMENT_AUDIT_SERVICE,
      useClass: AppointmentAuditService,
    },
  ],
  exports: [
    AppointmentsService,
    PreConsultationService,
    AppointmentStateMachineService,
    APPOINTMENT_REPOSITORY,
    APPOINTMENT_AUDIT_SERVICE,
  ],
})
export class AppointmentsModule {}
