// ==============================================================================
// MANVIA — Twilio SMS Provider (M8 Production Gateway)
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import type {
  ISmsProvider,
  SmsMessage,
  ProviderDeliveryResult,
} from '../interfaces/provider.interface.js';
import { ConfigService } from '../../../config/config.service.js';

@Injectable()
export class TwilioSmsProvider implements ISmsProvider {
  public readonly providerName = 'twilio';
  private readonly logger = new Logger(TwilioSmsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  public async send(message: SmsMessage): Promise<ProviderDeliveryResult> {
    const accountSid = this.configService?.raw?.TWILIO_ACCOUNT_SID;
    const authToken = this.configService?.raw?.TWILIO_AUTH_TOKEN;
    const fromNumber = this.configService?.raw?.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      this.logger.error('[Twilio] Credentials or from number are unconfigured in production');
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'MISSING_CREDENTIALS',
        failureReason: 'Twilio credentials not configured',
        isRetryable: false,
      };
    }

    const maskedPhone = message.phoneNumber.replace(/\d(?=\d{4})/g, '*');

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const params = new URLSearchParams({
        From: fromNumber,
        To: message.phoneNumber,
        Body: message.bodyText,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const isRetryable = response.status >= 500 || response.status === 429;
        this.logger.warn(
          `[Twilio] SMS to ${maskedPhone} failed: HTTP ${response.status} — ${errorBody}`,
        );

        return {
          success: false,
          provider: this.providerName,
          failureCode: `HTTP_${response.status}`,
          failureReason: errorBody.substring(0, 200),
          isRetryable,
        };
      }

      const data = (await response.json()) as { sid: string };
      this.logger.log(`[Twilio] SMS delivered to ${maskedPhone}. sid=${data.sid}`);

      return {
        success: true,
        provider: this.providerName,
        providerMessageId: data.sid,
        isRetryable: false,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Twilio] Network error sending to ${maskedPhone}: ${errorMsg}`);

      return {
        success: false,
        provider: this.providerName,
        failureCode: 'NETWORK_ERROR',
        failureReason: errorMsg,
        isRetryable: true,
      };
    }
  }
}
