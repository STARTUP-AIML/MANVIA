import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { NotificationAuthGuard } from '../guards/notification-auth.guard.js';
import { NotificationDeviceService } from '../services/notification-device.service.js';
import { RegisterDeviceDto, UpdateDeviceDto } from '../dto/device-request.dto.js';
import { NotificationDeviceResponseDto } from '../dto/notification-response.dto.js';
import type { NotificationDeviceEntity } from '../entities/notification.entity.js';

@ApiTags('Notifications')
@Controller('notifications/devices')
@UseGuards(NotificationAuthGuard)
@ApiBearerAuth('bearer-auth')
export class NotificationDevicesController {
  public constructor(private readonly deviceService: NotificationDeviceService) {}

  @Get()
  @ApiOperation({
    summary: 'List user active registered devices',
    description:
      'Retrieves all active push notification devices for authenticated user without leaking raw credentials.',
  })
  @ApiResponse({
    status: 200,
    type: [NotificationDeviceResponseDto],
  })
  public async getDevices(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<NotificationDeviceResponseDto[]> {
    const devices = await this.deviceService.getActiveDevices(user.userId);
    return devices.map((d) => this.toResponseDto(d));
  }

  @Post()
  @ApiOperation({
    summary: 'Register push notification device',
    description:
      'Registers or updates a device push token (Android, iOS, Web) for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Device successfully registered',
    type: NotificationDeviceResponseDto,
  })
  public async registerDevice(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: RegisterDeviceDto,
  ): Promise<NotificationDeviceResponseDto> {
    const device = await this.deviceService.registerDevice(user.userId, dto);
    return this.toResponseDto(device);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update device active state',
    description: 'Activates or deactivates an existing registered device.',
  })
  @ApiParam({ name: 'id', description: 'Internal device UUID' })
  @ApiResponse({
    status: 200,
    type: NotificationDeviceResponseDto,
  })
  public async updateDevice(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
  ): Promise<NotificationDeviceResponseDto> {
    const updated = await this.deviceService.updateDeviceStatus(
      id,
      user.userId,
      dto.active ?? true,
    );
    return this.toResponseDto(updated);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Unregister device',
    description: 'Deletes device registration and disables push token for user.',
  })
  @ApiParam({ name: 'id', description: 'Internal device UUID' })
  @ApiResponse({ status: 200, description: 'Device unregistered successfully' })
  public async removeDevice(
    @CurrentUser() user: CurrentUserContext,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const removed = await this.deviceService.removeDevice(id, user.userId);
    return { success: removed };
  }

  private toResponseDto(device: NotificationDeviceEntity): NotificationDeviceResponseDto {
    return {
      id: device.id,
      userId: device.userId,
      platform: device.platform,
      deviceId: device.deviceId,
      active: device.active,
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
      createdAt: device.createdAt.toISOString(),
      updatedAt: device.updatedAt.toISOString(),
    };
  }
}
