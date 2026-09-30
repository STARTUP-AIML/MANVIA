import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from '../interfaces/notification-repository.interface.js';
import {
  NOTIFICATION_AUDIT_SERVICE,
  type INotificationAuditService,
} from '../interfaces/notification-audit-service.interface.js';
import type { NotificationDeviceEntity } from '../entities/notification.entity.js';
import type { RegisterDeviceDto } from '../dto/device-request.dto.js';

@Injectable()
export class NotificationDeviceService {
  public constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(NOTIFICATION_AUDIT_SERVICE)
    private readonly auditService: INotificationAuditService,
  ) {}

  public async registerDevice(
    userId: string,
    dto: RegisterDeviceDto,
  ): Promise<NotificationDeviceEntity> {
    if (!dto.pushToken || dto.pushToken.trim().length === 0) {
      throw new BadRequestException('Push token is required');
    }

    const device = await this.repository.registerDevice({
      userId,
      platform: dto.platform,
      pushToken: dto.pushToken.trim(),
      deviceId: dto.deviceId?.trim() || null,
      active: true,
      lastSeenAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'DEVICE_REGISTERED',
      actorId: userId,
      role: 'USER',
      resource: `device:${device.id}`,
      action: 'REGISTER',
      metadata: {
        platform: dto.platform,
        deviceId: dto.deviceId,
        pushToken: dto.pushToken, // Will be redacted by audit service
      },
    });

    return device;
  }

  public async getActiveDevices(userId: string): Promise<NotificationDeviceEntity[]> {
    return this.repository.findDevicesByUserId(userId, true);
  }

  public async updateDeviceStatus(
    deviceId: string,
    userId: string,
    active: boolean,
  ): Promise<NotificationDeviceEntity> {
    const device = await this.repository.findDeviceById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Access to device denied');
    }

    const updated = await this.repository.updateDevice(deviceId, {
      active,
      lastSeenAt: new Date(),
    });

    this.auditService.logEvent({
      event: 'DEVICE_STATUS_UPDATED',
      actorId: userId,
      role: 'USER',
      resource: `device:${deviceId}`,
      action: 'UPDATE',
      metadata: { active },
    });

    return updated;
  }

  public async removeDevice(deviceId: string, userId: string): Promise<boolean> {
    const device = await this.repository.findDeviceById(deviceId);
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    if (device.userId !== userId) {
      throw new ForbiddenException('Access to device denied');
    }

    const removed = await this.repository.deleteDevice(deviceId, userId);

    this.auditService.logEvent({
      event: 'DEVICE_REMOVED',
      actorId: userId,
      role: 'USER',
      resource: `device:${deviceId}`,
      action: 'DELETE',
    });

    return removed;
  }
}
