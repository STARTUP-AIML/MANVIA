import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../doctors/decorators/current-user.decorator.js';
import type { CurrentUserContext } from '../../doctors/interfaces/auth-context.interface.js';
import { NotificationAuthGuard } from '../guards/notification-auth.guard.js';
import { NotificationPreferencesService } from '../services/notification-preferences.service.js';
import { UpdateNotificationPreferencesDto } from '../dto/update-preferences.dto.js';
import { NotificationPreferenceResponseDto } from '../dto/notification-response.dto.js';
import type { NotificationPreferenceEntity } from '../entities/notification.entity.js';

@ApiTags('Notifications')
@Controller('notifications/preferences')
@UseGuards(NotificationAuthGuard)
@ApiBearerAuth('bearer-auth')
export class NotificationPreferencesController {
  public constructor(private readonly preferencesService: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Retrieves current user notification channel and category preferences.',
  })
  @ApiResponse({
    status: 200,
    description: 'User notification preferences',
    type: NotificationPreferenceResponseDto,
  })
  public async getPreferences(
    @CurrentUser() user: CurrentUserContext,
  ): Promise<NotificationPreferenceResponseDto> {
    const pref = await this.preferencesService.getPreferences(user.userId);
    return this.toResponseDto(pref);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update notification preferences',
    description:
      'Updates notification channel and category settings. Security notifications remain strictly mandatory.',
  })
  @ApiResponse({
    status: 200,
    description: 'Updated notification preferences',
    type: NotificationPreferenceResponseDto,
  })
  public async updatePreferences(
    @CurrentUser() user: CurrentUserContext,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceResponseDto> {
    const updated = await this.preferencesService.updatePreferences(
      user.userId,
      dto,
      user.userId,
      user.activeRole,
    );
    return this.toResponseDto(updated);
  }

  private toResponseDto(pref: NotificationPreferenceEntity): NotificationPreferenceResponseDto {
    return {
      id: pref.id,
      userId: pref.userId,
      emailEnabled: pref.emailEnabled,
      pushEnabled: pref.pushEnabled,
      smsEnabled: pref.smsEnabled,
      inAppEnabled: pref.inAppEnabled,
      appointmentNotifications: pref.appointmentNotifications,
      wellnessNotifications: pref.wellnessNotifications,
      marketingNotifications: pref.marketingNotifications,
      systemNotifications: pref.systemNotifications,
      securityNotifications: true, // Invariant: Security is always enabled
      createdAt: pref.createdAt.toISOString(),
      updatedAt: pref.updatedAt.toISOString(),
    };
  }
}
