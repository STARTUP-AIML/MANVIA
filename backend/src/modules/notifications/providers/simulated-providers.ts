import { Injectable, Logger } from '@nestjs/common';
import type {
  IEmailProvider,
  IPushProvider,
  ISmsProvider,
  EmailMessage,
  PushMessage,
  SmsMessage,
  ProviderDeliveryResult,
} from '../interfaces/provider.interface.js';

@Injectable()
export class SimulatedEmailProvider implements IEmailProvider {
  public readonly providerName = 'simulated-email';
  private readonly logger = new Logger(SimulatedEmailProvider.name);
  public failNextWithTransient = false;
  public failNextWithPermanent = false;
  public sentEmails: EmailMessage[] = [];

  public async send(message: EmailMessage): Promise<ProviderDeliveryResult> {
    if (this.failNextWithPermanent) {
      this.failNextWithPermanent = false;
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'INVALID_RECIPIENT',
        failureReason: 'Mailbox does not exist or address is rejected',
        isRetryable: false,
      };
    }

    if (this.failNextWithTransient) {
      this.failNextWithTransient = false;
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'TIMEOUT_ERROR',
        failureReason: 'Connection timed out while connecting to SMTP relay',
        isRetryable: true,
      };
    }

    this.sentEmails.push({ ...message });
    this.logger.log(`[EMAIL_SENT] to=${message.recipientEmail} subject="${message.subject}"`);
    return {
      success: true,
      provider: this.providerName,
      providerMessageId: `email_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isRetryable: false,
    };
  }

  public clear(): void {
    this.sentEmails = [];
    this.failNextWithTransient = false;
    this.failNextWithPermanent = false;
  }
}

@Injectable()
export class SimulatedPushProvider implements IPushProvider {
  public readonly providerName = 'simulated-push';
  private readonly logger = new Logger(SimulatedPushProvider.name);
  public failNextWithTransient = false;
  public failNextWithPermanent = false;
  public sentPushes: PushMessage[] = [];

  public async send(message: PushMessage): Promise<ProviderDeliveryResult> {
    if (this.failNextWithPermanent) {
      this.failNextWithPermanent = false;
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'INVALID_DEVICE_TOKEN',
        failureReason: 'Device registration token has expired or is invalid',
        isRetryable: false,
      };
    }

    if (this.failNextWithTransient) {
      this.failNextWithTransient = false;
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'RATE_LIMIT_EXCEEDED',
        failureReason: 'APNs/FCM rate limit hit, backoff required',
        isRetryable: true,
      };
    }

    this.sentPushes.push({ ...message });
    this.logger.log(
      `[PUSH_SENT] token=${message.pushToken.substring(0, 10)}... title="${message.title}"`,
    );
    return {
      success: true,
      provider: this.providerName,
      providerMessageId: `push_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isRetryable: false,
    };
  }

  public clear(): void {
    this.sentPushes = [];
    this.failNextWithTransient = false;
    this.failNextWithPermanent = false;
  }
}

@Injectable()
export class SimulatedSmsProvider implements ISmsProvider {
  public readonly providerName = 'simulated-sms';
  private readonly logger = new Logger(SimulatedSmsProvider.name);
  public failNextWithTransient = false;
  public failNextWithPermanent = false;
  public sentSms: SmsMessage[] = [];

  public async send(message: SmsMessage): Promise<ProviderDeliveryResult> {
    if (this.failNextWithPermanent) {
      this.failNextWithPermanent = false;
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'INVALID_PHONE_NUMBER',
        failureReason: 'Destination phone number is invalid or cannot receive SMS',
        isRetryable: false,
      };
    }

    if (this.failNextWithTransient) {
      this.failNextWithTransient = false;
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'GATEWAY_TIMEOUT',
        failureReason: 'SMS provider gateway temporarily unreachable',
        isRetryable: true,
      };
    }

    this.sentSms.push({ ...message });
    // Sanitize phone number in logs
    const maskedPhone = message.phoneNumber.replace(/\d(?=\d{4})/g, '*');
    this.logger.log(`[SMS_SENT] to=${maskedPhone}`);
    return {
      success: true,
      provider: this.providerName,
      providerMessageId: `sms_msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      isRetryable: false,
    };
  }

  public clear(): void {
    this.sentSms = [];
    this.failNextWithTransient = false;
    this.failNextWithPermanent = false;
  }
}
