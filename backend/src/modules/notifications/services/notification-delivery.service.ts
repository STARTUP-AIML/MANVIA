import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFICATION_REPOSITORY,
  type INotificationRepository,
} from '../interfaces/notification-repository.interface.js';
import {
  EMAIL_PROVIDER,
  PUSH_PROVIDER,
  SMS_PROVIDER,
  type IEmailProvider,
  type IPushProvider,
  type ISmsProvider,
} from '../interfaces/provider.interface.js';
import { NotificationChannel, DeliveryStatus } from '../enums/index.js';
import type {
  NotificationEntity,
  NotificationDeliveryEntity,
} from '../entities/notification.entity.js';

export interface DispatchParams {
  notification: NotificationEntity;
  channel: NotificationChannel;
  recipientEmail?: string | undefined;
  recipientPhone?: string | undefined;
  pushTokens?: string[] | undefined;
  locale?: string | undefined;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);
  public static readonly MAX_RETRIES = 3;

  public constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly repository: INotificationRepository,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: IPushProvider,
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: ISmsProvider,
  ) {}

  public async dispatchChannel(params: DispatchParams): Promise<NotificationDeliveryEntity> {
    const { notification, channel } = params;

    // Create initial delivery record in PENDING status
    const delivery = await this.repository.createDelivery({
      notificationId: notification.id,
      channel,
      status: DeliveryStatus.PENDING,
      provider: null,
      providerMessageId: null,
      attemptCount: 0,
      lastAttemptAt: null,
      deliveredAt: null,
      failedAt: null,
      failureCode: null,
      failureReason: null,
      metadata: null,
    });

    return this.executeDelivery(delivery, params);
  }

  public async executeDelivery(
    delivery: NotificationDeliveryEntity,
    params: DispatchParams,
  ): Promise<NotificationDeliveryEntity> {
    const { notification, channel } = params;
    const attempt = delivery.attemptCount + 1;
    const now = new Date();

    // Transition to PROCESSING
    await this.repository.updateDelivery(delivery.id, {
      status: DeliveryStatus.PROCESSING,
      attemptCount: attempt,
      lastAttemptAt: now,
    });

    try {
      if (channel === NotificationChannel.IN_APP) {
        // In-app notifications are stored persistently in DB; delivery is instant
        return await this.repository.updateDelivery(delivery.id, {
          status: DeliveryStatus.DELIVERED,
          provider: 'internal-inapp',
          providerMessageId: notification.publicNotificationId,
          deliveredAt: new Date(),
        });
      }

      if (channel === NotificationChannel.EMAIL) {
        if (!params.recipientEmail) {
          return await this.repository.updateDelivery(delivery.id, {
            status: DeliveryStatus.FAILED,
            failureCode: 'MISSING_RECIPIENT_EMAIL',
            failureReason: 'User has no verified email address',
            failedAt: new Date(),
          });
        }

        const res = await this.emailProvider.send({
          recipientEmail: params.recipientEmail,
          subject: notification.title,
          bodyText: notification.body,
          locale: params.locale,
          idempotencyKey: `${delivery.id}_att_${attempt}`,
          correlationId: notification.id,
        });

        if (res.success) {
          return await this.repository.updateDelivery(delivery.id, {
            status: DeliveryStatus.DELIVERED,
            provider: res.provider,
            providerMessageId: res.providerMessageId ?? null,
            deliveredAt: new Date(),
          });
        }

        return await this.repository.updateDelivery(delivery.id, {
          status: DeliveryStatus.FAILED,
          provider: res.provider,
          failureCode: res.failureCode ?? 'UNKNOWN_ERROR',
          failureReason: res.failureReason ?? 'Email delivery failed',
          failedAt: new Date(),
          metadata: { isRetryable: res.isRetryable },
        });
      }

      if (channel === NotificationChannel.PUSH) {
        if (!params.pushTokens || params.pushTokens.length === 0) {
          return await this.repository.updateDelivery(delivery.id, {
            status: DeliveryStatus.FAILED,
            failureCode: 'NO_ACTIVE_DEVICES',
            failureReason: 'User has no registered active push devices',
            failedAt: new Date(),
          });
        }

        // Send to registered active device tokens
        let anySuccess = false;
        let lastFailureCode = '';
        let lastFailureReason = '';

        for (const token of params.pushTokens) {
          const res = await this.pushProvider.send({
            pushToken: token,
            title: notification.title,
            body: notification.body,
            idempotencyKey: `${delivery.id}_${token.substring(0, 8)}`,
          });
          if (res.success) {
            anySuccess = true;
          } else {
            lastFailureCode = res.failureCode || 'PUSH_FAILED';
            lastFailureReason = res.failureReason || 'Failed to deliver push';
          }
        }

        if (anySuccess) {
          return await this.repository.updateDelivery(delivery.id, {
            status: DeliveryStatus.DELIVERED,
            provider: this.pushProvider.providerName,
            deliveredAt: new Date(),
          });
        }

        return await this.repository.updateDelivery(delivery.id, {
          status: DeliveryStatus.FAILED,
          provider: this.pushProvider.providerName,
          failureCode: lastFailureCode,
          failureReason: lastFailureReason,
          failedAt: new Date(),
        });
      }

      if (channel === NotificationChannel.SMS) {
        if (!params.recipientPhone) {
          return await this.repository.updateDelivery(delivery.id, {
            status: DeliveryStatus.FAILED,
            failureCode: 'MISSING_PHONE_NUMBER',
            failureReason: 'User has no verified phone number',
            failedAt: new Date(),
          });
        }

        const res = await this.smsProvider.send({
          phoneNumber: params.recipientPhone,
          bodyText: notification.body,
          idempotencyKey: `${delivery.id}_att_${attempt}`,
        });

        if (res.success) {
          return await this.repository.updateDelivery(delivery.id, {
            status: DeliveryStatus.DELIVERED,
            provider: res.provider,
            providerMessageId: res.providerMessageId ?? null,
            deliveredAt: new Date(),
          });
        }

        return await this.repository.updateDelivery(delivery.id, {
          status: DeliveryStatus.FAILED,
          provider: res.provider,
          failureCode: res.failureCode ?? 'SMS_FAILED',
          failureReason: res.failureReason ?? 'SMS delivery failed',
          failedAt: new Date(),
          metadata: { isRetryable: res.isRetryable },
        });
      }

      throw new Error(`Unsupported notification channel: ${channel}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Execution error';
      this.logger.error(`Delivery execution error for ${delivery.id}: ${message}`);
      return await this.repository.updateDelivery(delivery.id, {
        status: DeliveryStatus.FAILED,
        failureCode: 'EXECUTION_EXCEPTION',
        failureReason: message,
        failedAt: new Date(),
      });
    }
  }

  public async retryDelivery(
    deliveryId: string,
    recipientInfo?: { email?: string; phone?: string; tokens?: string[] },
  ): Promise<NotificationDeliveryEntity> {
    const delivery = await this.repository.findDeliveryById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery not found: ${deliveryId}`);
    }

    if (delivery.attemptCount >= NotificationDeliveryService.MAX_RETRIES) {
      throw new Error(
        `Max retry limit (${NotificationDeliveryService.MAX_RETRIES}) reached for delivery ${deliveryId}`,
      );
    }

    const notification = await this.repository.findById(delivery.notificationId);
    if (!notification) {
      throw new Error(`Notification not found for delivery: ${deliveryId}`);
    }

    return this.executeDelivery(delivery, {
      notification,
      channel: delivery.channel,
      recipientEmail: recipientInfo?.email,
      recipientPhone: recipientInfo?.phone,
      pushTokens: recipientInfo?.tokens,
    });
  }
}
