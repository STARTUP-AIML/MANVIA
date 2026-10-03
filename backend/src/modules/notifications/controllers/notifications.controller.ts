import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { NotificationAuthGuard } from '../guards/notification-auth.guard.js';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
  type NotificationFilterOptions,
} from '../interfaces/notification-repository.interface.js';
import {
  NOTIFICATION_AUDIT_SERVICE,
  type INotificationAuditService,
} from '../interfaces/notification-audit-service.interface.js';
import type {
  NotificationEntity,
  NotificationDeliveryEntity,
} from '../entities/notification.entity.js';
import { Inject } from '@nestjs/common';
import {
  NotificationResponseDto,
  PaginatedNotificationsResponseDto,
} from '../dto/notification-response.dto.js';
import { NotificationQueryDto } from '../dto/notification-query.dto.js';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(NotificationAuthGuard)
@ApiBearerAuth('bearer-auth')
export class NotificationsController {
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(NOTIFICATION_AUDIT_SERVICE)
    private readonly auditService: INotificationAuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List notifications for authenticated user',
    description:
      'Retrieves a paginated list of notifications belonging exclusively to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated notifications list',
    type: PaginatedNotificationsResponseDto,
  })
  public async getNotifications(
    @CurrentUser() user: CurrentUserContext,
    @Query() query: NotificationQueryDto,
  ): Promise<PaginatedNotificationsResponseDto> {
    const filter: NotificationFilterOptions = {
      userId: user.userId,
      page: query.page,
      limit: query.limit,
    };
    if (query.unreadOnly) {
      filter.isRead = false;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.severity) {
      filter.severity = query.severity;
    }

    const [result, unreadCount] = await Promise.all([
      this.repository.findUserNotifications(filter),
      this.repository.countUnread(user.userId),
    ]);

    return {
      data: result.data.map((n) => this.toResponseDto(n)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      unreadCount,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single notification details',
    description:
      'Retrieves notification by UUID or public ID (NOT-XXXXXXXX). Enforces strict user isolation.',
  })
  @ApiParam({ name: 'id', description: 'Internal UUID or public NOT-XXXXXXXX ID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  @ApiResponse({ status: 403, description: 'Access to another user’s notification forbidden' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  public async getNotificationById(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    const isPublicId = id.startsWith('NOT-');
    const notification = isPublicId
      ? await this.repository.findByPublicId(id)
      : await this.repository.findById(id);

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.userId !== user.userId && user.activeRole !== 'ADMIN') {
      throw new ForbiddenException('Forbidden: cannot access another user’s notification');
    }

    return this.toResponseDto(notification);
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark single notification as read',
    description: 'Updates notification state to read and stamps read timestamp.',
  })
  @ApiParam({ name: 'id', description: 'Internal notification UUID' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  public async markAsRead(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.userId !== user.userId && user.activeRole !== 'ADMIN') {
      throw new ForbiddenException('Forbidden: cannot modify another user’s notification');
    }

    const updated = await this.repository.markAsRead(id, user.userId);
    return this.toResponseDto(updated ?? notification);
  }

  @Post('read-all')
  @ApiOperation({
    summary: 'Mark all unread notifications as read',
    description: 'Marks all notifications for the authenticated user as read in bulk.',
  })
  @ApiResponse({ status: 200, description: 'Count of marked notifications' })
  public async markAllAsRead(@CurrentUser() user: CurrentUserContext): Promise<{ count: number }> {
    const count = await this.repository.markAllAsRead(user.userId);
    return { count };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Removes an in-app notification from the user inbox.',
  })
  @ApiParam({ name: 'id', description: 'Internal notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  public async deleteNotification(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.userId !== user.userId && user.activeRole !== 'ADMIN') {
      throw new ForbiddenException('Forbidden: cannot delete another user’s notification');
    }

    const deleted = await this.repository.deleteNotification(id, user.userId);

    this.auditService.logEvent({
      event: 'NOTIFICATION_DELETED',
      actorId: user.userId,
      role: user.activeRole,
      resource: `notification:${id}`,
      action: 'DELETE',
    });

    return { success: deleted };
  }

  private toResponseDto(entity: NotificationEntity): NotificationResponseDto {
    return {
      id: entity.id,
      publicNotificationId: entity.publicNotificationId,
      userId: entity.userId,
      type: entity.type,
      title: entity.title,
      body: entity.body,
      severity: entity.severity,
      isRead: entity.isRead,
      readAt: entity.readAt ? entity.readAt.toISOString() : null,
      expiresAt: entity.expiresAt ? entity.expiresAt.toISOString() : null,
      metadata: entity.metadata,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      deliveries: entity.deliveries?.map((d: NotificationDeliveryEntity) => ({
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
      })),
    };
  }
}
