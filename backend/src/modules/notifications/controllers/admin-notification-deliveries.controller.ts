import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { NotificationAuthGuard } from '../guards/notification-auth.guard.js';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from '../interfaces/notification-repository.interface.js';
import {
  NOTIFICATION_AUDIT_SERVICE,
  type INotificationAuditService,
} from '../interfaces/notification-audit-service.interface.js';
import { NotificationDeliveryService } from '../services/notification-delivery.service.js';
import { NotificationDeliveryResponseDto } from '../dto/notification-response.dto.js';
import { NotificationChannel, DeliveryStatus } from '../enums/index.js';

@ApiTags('Admin Notifications')
@Controller('admin/notifications')
@UseGuards(NotificationAuthGuard)
@ApiBearerAuth('bearer-auth')
export class AdminNotificationDeliveriesController {
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(NOTIFICATION_AUDIT_SERVICE)
    private readonly auditService: INotificationAuditService,
    private readonly deliveryService: NotificationDeliveryService,
  ) {}

  @Get('deliveries')
  @ApiOperation({
    summary: 'Inspect pending or failed notification deliveries',
    description: 'Admin endpoint to view failed or stuck delivery jobs across channels.',
  })
  @ApiResponse({
    status: 200,
    type: [NotificationDeliveryResponseDto],
  })
  public async getDeliveries(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<NotificationDeliveryResponseDto[]> {
    if (user.activeRole !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }

    const deliveries = await this.repository.findPendingOrFailedDeliveries(100);
    return deliveries.map((d) => this.toResponseDto(d));
  }

  @Post('deliveries/:id/retry')
  @ApiOperation({
    summary: 'Retry a failed notification delivery',
    description:
      'Admin endpoint to trigger immediate retry of a failed channel delivery within bounded limits.',
  })
  @ApiParam({ name: 'id', description: 'Internal delivery UUID' })
  @ApiResponse({
    status: 200,
    type: NotificationDeliveryResponseDto,
  })
  public async retryDelivery(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<NotificationDeliveryResponseDto> {
    if (user.activeRole !== 'ADMIN') {
      throw new ForbiddenException('Admin role required');
    }

    const delivery = await this.repository.findDeliveryById(id);
    if (!delivery) {
      throw new NotFoundException(`Delivery ${id} not found`);
    }

    try {
      const retried = await this.deliveryService.retryDelivery(id);

      this.auditService.logEvent({
        event: 'NOTIFICATION_DELIVERY_RETRIED',
        actorId: user.userId,
        role: user.activeRole,
        resource: `delivery:${id}`,
        action: 'RETRY',
        metadata: {
          channel: delivery.channel,
          newStatus: retried.status,
        },
      });

      return this.toResponseDto(retried);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Retry failed';
      throw new BadRequestException(message);
    }
  }

  private toResponseDto(d: {
    id: string;
    notificationId: string;
    channel: NotificationChannel;
    status: DeliveryStatus;
    provider: string | null;
    providerMessageId: string | null;
    attemptCount: number;
    lastAttemptAt: Date | null;
    deliveredAt: Date | null;
    failedAt: Date | null;
    failureCode: string | null;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): NotificationDeliveryResponseDto {
    return {
      id: d.id,
      notificationId: d.notificationId,
      channel: d.channel,
      status: d.status,
      provider: d.provider,
      providerMessageId: d.providerMessageId,
      attemptCount: d.attemptCount,
      lastAttemptAt: d.lastAttemptAt ? d.lastAttemptAt.toISOString() : null,
      deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
      failedAt: d.failedAt ? d.failedAt.toISOString() : null,
      failureCode: d.failureCode,
      failureReason: d.failureReason,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }
}
