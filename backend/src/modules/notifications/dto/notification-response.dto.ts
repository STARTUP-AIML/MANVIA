import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  NotificationType,
  NotificationChannel,
  NotificationSeverity,
  DeliveryStatus,
  DevicePlatform,
} from '../enums/index.js';

export class NotificationDeliveryResponseDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000002' })
  public notificationId!: string;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.IN_APP })
  public channel!: NotificationChannel;

  @ApiProperty({ enum: DeliveryStatus, example: DeliveryStatus.DELIVERED })
  public status!: DeliveryStatus;

  @ApiPropertyOptional({ example: 'internal-inapp' })
  public provider!: string | null;

  @ApiPropertyOptional({ example: 'msg_12345678' })
  public providerMessageId!: string | null;

  @ApiProperty({ example: 1 })
  public attemptCount!: number;

  @ApiPropertyOptional({ example: '2026-10-01T12:00:00.000Z' })
  public lastAttemptAt!: string | null;

  @ApiPropertyOptional({ example: '2026-10-01T12:00:01.000Z' })
  public deliveredAt!: string | null;

  @ApiPropertyOptional({ example: null })
  public failedAt!: string | null;

  @ApiPropertyOptional({ example: null })
  public failureCode!: string | null;

  @ApiPropertyOptional({ example: null })
  public failureReason!: string | null;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-10-01T12:00:01.000Z' })
  public updatedAt!: string;
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'a0000000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'NOT-A1B2C3D4' })
  public publicNotificationId!: string;

  @ApiProperty({ example: 'u0000000-0000-0000-0000-000000000001' })
  public userId!: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.APPOINTMENT_CONFIRMED })
  public type!: NotificationType;

  @ApiProperty({ example: 'Appointment Confirmed' })
  public title!: string;

  @ApiProperty({ example: 'Your appointment on 15 Oct 2026 has been confirmed.' })
  public body!: string;

  @ApiProperty({ enum: NotificationSeverity, example: NotificationSeverity.INFO })
  public severity!: NotificationSeverity;

  @ApiProperty({ example: false })
  public isRead!: boolean;

  @ApiPropertyOptional({ example: null })
  public readAt!: string | null;

  @ApiPropertyOptional({ example: null })
  public expiresAt!: string | null;

  @ApiPropertyOptional({ example: { appointmentId: 'apt-123' } })
  public metadata!: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public updatedAt!: string;

  @ApiPropertyOptional({ type: [NotificationDeliveryResponseDto] })
  public deliveries?: NotificationDeliveryResponseDto[] | undefined;
}

export class PaginatedNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  public data!: NotificationResponseDto[];

  @ApiProperty({ example: 1 })
  public total!: number;

  @ApiProperty({ example: 1 })
  public page!: number;

  @ApiProperty({ example: 20 })
  public limit!: number;

  @ApiProperty({ example: 1 })
  public totalPages!: number;

  @ApiProperty({ example: 0 })
  public unreadCount!: number;
}

export class NotificationPreferenceResponseDto {
  @ApiProperty({ example: 'pref0000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'u0000000-0000-0000-0000-000000000001' })
  public userId!: string;

  @ApiProperty({ example: true })
  public emailEnabled!: boolean;

  @ApiProperty({ example: true })
  public pushEnabled!: boolean;

  @ApiProperty({ example: false })
  public smsEnabled!: boolean;

  @ApiProperty({ example: true })
  public inAppEnabled!: boolean;

  @ApiProperty({ example: true })
  public appointmentNotifications!: boolean;

  @ApiProperty({ example: true })
  public wellnessNotifications!: boolean;

  @ApiProperty({ example: false })
  public marketingNotifications!: boolean;

  @ApiProperty({ example: true })
  public systemNotifications!: boolean;

  @ApiProperty({
    example: true,
    description: 'Mandatory security notifications are always enabled and cannot be disabled',
  })
  public securityNotifications!: boolean;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public updatedAt!: string;
}

export class NotificationDeviceResponseDto {
  @ApiProperty({ example: 'dev00000-0000-0000-0000-000000000001' })
  public id!: string;

  @ApiProperty({ example: 'u0000000-0000-0000-0000-000000000001' })
  public userId!: string;

  @ApiProperty({ enum: DevicePlatform, example: DevicePlatform.ANDROID })
  public platform!: DevicePlatform;

  @ApiPropertyOptional({ example: 'device-uuid-123' })
  public deviceId!: string | null;

  @ApiProperty({ example: true })
  public active!: boolean;

  @ApiPropertyOptional({ example: '2026-10-01T12:00:00.000Z' })
  public lastSeenAt!: string | null;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public createdAt!: string;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z' })
  public updatedAt!: string;
}
