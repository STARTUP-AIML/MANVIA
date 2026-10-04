import { Module, forwardRef } from '@nestjs/common';
import { CareRelationshipsModule } from '../care-relationships/care-relationships.module.js';
import { DoctorsModule } from '../doctors/doctors.module.js';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { RefundsController } from './controllers/refunds.controller.js';
import { RefundsService } from './services/refunds.service.js';
import { RefundAuditService } from './services/refund-audit.service.js';
import { SimulatedRefundProvider } from './providers/simulated-refund.provider.js';
import { InMemoryRefundRepository } from './repositories/in-memory-refund.repository.js';
import { PrismaRefundRepository } from './repositories/prisma-refund.repository.js';
import { REFUND_REPOSITORY } from './interfaces/refund-repository.interface.js';
import { REFUND_PROVIDER } from './interfaces/refund-provider.interface.js';
import { REFUND_AUDIT_SERVICE } from './interfaces/refund-audit-service.interface.js';
import { NOTIFICATION_SERVICE } from '../../common/notifications/notification.interface.js';
import { DatabaseModule } from '../../database/database.module.js';
import { NotificationService } from '../../common/notifications/notification.service.js';

@Module({
  imports: [
    DatabaseModule,
    CareRelationshipsModule,
    DoctorsModule,
    forwardRef(() => AppointmentsModule),
  ],
  controllers: [RefundsController],
  providers: [
    RefundsService,
    RefundAuditService,
    SimulatedRefundProvider,
    NotificationService,
    InMemoryRefundRepository,
    PrismaRefundRepository,
    {
      provide: REFUND_REPOSITORY,
      useClass: PrismaRefundRepository,
    },
    {
      provide: REFUND_PROVIDER,
      useClass: SimulatedRefundProvider,
    },
    {
      provide: REFUND_AUDIT_SERVICE,
      useClass: RefundAuditService,
    },
    {
      provide: NOTIFICATION_SERVICE,
      useClass: NotificationService,
    },
  ],
  exports: [
    RefundsService,
    RefundAuditService,
    REFUND_REPOSITORY,
    REFUND_PROVIDER,
    REFUND_AUDIT_SERVICE,
  ],
})
export class RefundsModule {}
