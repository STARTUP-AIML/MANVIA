import { Module, forwardRef } from '@nestjs/common';
import { CareRelationshipsModule } from '../care-relationships/care-relationships.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { DoctorAvailabilityModule } from '../doctor-availability/doctor-availability.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { WaitlistController } from './controllers/waitlist.controller.js';
import { DoctorWaitlistController } from './controllers/doctor-waitlist.controller.js';
import { WaitlistService } from './services/waitlist.service.js';
import { WaitlistAuditService } from './services/waitlist-audit.service.js';
import { InMemoryWaitlistRepository } from './repositories/in-memory-waitlist.repository.js';
import { PrismaWaitlistRepository } from './repositories/prisma-waitlist.repository.js';
import { WAITLIST_REPOSITORY } from './interfaces/waitlist-repository.interface.js';
import { WAITLIST_AUDIT_SERVICE } from './interfaces/waitlist-audit-service.interface.js';
import { NOTIFICATION_SERVICE } from '../../common/notifications/notification.interface.js';
import { NotificationService } from '../../common/notifications/notification.service.js';

@Module({
  imports: [
    CareRelationshipsModule,
    DoctorsModule,
    DoctorAvailabilityModule,
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [WaitlistController, DoctorWaitlistController],
  providers: [
    WaitlistService,
    WaitlistAuditService,
    NotificationService,
    InMemoryWaitlistRepository,
    PrismaWaitlistRepository,
    {
      provide: WAITLIST_REPOSITORY,
      useClass: InMemoryWaitlistRepository,
    },
    {
      provide: WAITLIST_AUDIT_SERVICE,
      useClass: WaitlistAuditService,
    },
    {
      provide: NOTIFICATION_SERVICE,
      useClass: NotificationService,
    },
  ],
  exports: [WaitlistService, WaitlistAuditService, WAITLIST_REPOSITORY, WAITLIST_AUDIT_SERVICE],
})
export class WaitlistModule {}
