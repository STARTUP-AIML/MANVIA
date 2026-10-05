// ==============================================================================
// MANVIA — Resend Email Provider (M8 Production Gateway)
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import type {
  IEmailProvider,
  EmailMessage,
  ProviderDeliveryResult,
} from '../interfaces/provider.interface.js';
import { ConfigService } from '../../../config/config.service.js';

@Injectable()
export class ResendEmailProvider implements IEmailProvider {
  public readonly providerName = 'resend';
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  public async send(message: EmailMessage): Promise<ProviderDeliveryResult> {
    const apiKey = this.configService?.raw?.RESEND_API_KEY;
    const fromAddress =
      this.configService?.raw?.EMAIL_FROM || 'MANVIA Health <notifications@manvia.health>';

    if (!apiKey) {
      this.logger.error('[Resend] RESEND_API_KEY is not configured in production environment');
      return {
        success: false,
        provider: this.providerName,
        failureCode: 'MISSING_API_KEY',
        failureReason: 'Resend API key is unconfigured',
        isRetryable: false,
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [message.recipientEmail],
          subject: message.subject,
          text: message.bodyText,
          ...(message.bodyHtml ? { html: message.bodyHtml } : {}),
          tags: [
            { name: 'category', value: 'manvia_notification' },
            ...(message.correlationId
              ? [{ name: 'correlation_id', value: message.correlationId }]
              : []),
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        const isRetryable = response.status >= 500 || response.status === 429;
        this.logger.warn(`[Resend] Delivery failed: HTTP ${response.status} — ${errorBody}`);

        return {
          success: false,
          provider: this.providerName,
          failureCode: `HTTP_${response.status}`,
          failureReason: errorBody.substring(0, 200),
          isRetryable,
        };
      }

      const data = (await response.json()) as { id: string };
      this.logger.log(`[Resend] Email delivered successfully. id=${data.id}`);

      return {
        success: true,
        provider: this.providerName,
        providerMessageId: data.id,
        isRetryable: false,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Resend] Network error: ${errorMsg}`);

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
