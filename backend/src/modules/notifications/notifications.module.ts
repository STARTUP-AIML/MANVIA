import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { NOTIFICATION_REPOSITORY } from './interfaces/notification-repository.interface.js';
import { PrismaNotificationRepository } from './repositories/prisma-notification.repository.js';
import { NOTIFICATION_AUDIT_SERVICE } from './interfaces/notification-audit-service.interface.js';
import { NotificationAuditService } from './services/notification-audit.service.js';
import { EMAIL_PROVIDER, PUSH_PROVIDER, SMS_PROVIDER } from './interfaces/provider.interface.js';
import {
  SimulatedEmailProvider,
  SimulatedPushProvider,
  SimulatedSmsProvider,
} from './providers/simulated-providers.js';
import { TemplateEngineService } from './services/template-engine.service.js';
import { NotificationPreferencesService } from './services/notification-preferences.service.js';
import { NotificationDeviceService } from './services/notification-device.service.js';
import { NotificationDeliveryService } from './services/notification-delivery.service.js';
import { NotificationOrchestratorService } from './services/notification-orchestrator.service.js';
import { NotificationsController } from './controllers/notifications.controller.js';
import { NotificationPreferencesController } from './controllers/notification-preferences.controller.js';
import { NotificationDevicesController } from './controllers/notification-devices.controller.js';
import { AdminNotificationDeliveriesController } from './controllers/admin-notification-deliveries.controller.js';
import { NotificationAuthGuard } from './guards/notification-auth.guard.js';

@Module({
  imports: [DatabaseModule],
  controllers: [
    NotificationsController,
    NotificationPreferencesController,
    NotificationDevicesController,
    AdminNotificationDeliveriesController,
  ],
  providers: [
    TemplateEngineService,
    NotificationPreferencesService,
    NotificationDeviceService,
    NotificationDeliveryService,
    NotificationOrchestratorService,
    NotificationAuthGuard,
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: NOTIFICATION_AUDIT_SERVICE,
      useClass: NotificationAuditService,
    },
    {
      provide: EMAIL_PROVIDER,
      useClass: SimulatedEmailProvider,
    },
    {
      provide: PUSH_PROVIDER,
      useClass: SimulatedPushProvider,
    },
    {
      provide: SMS_PROVIDER,
      useClass: SimulatedSmsProvider,
    },
  ],
  exports: [
    NotificationOrchestratorService,
    NotificationPreferencesService,
    NotificationDeviceService,
    NotificationDeliveryService,
    TemplateEngineService,
    NOTIFICATION_REPOSITORY,
    NOTIFICATION_AUDIT_SERVICE,
  ],
})
export class NotificationsModule {}
