// ==============================================================================
// MANVIA — Production Razorpay Payment Provider (M8)
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '../../../config/config.service.js';
import type {
  IPaymentProvider,
  CreatePaymentSessionParams,
  ProviderPaymentSession,
  VerifyPaymentParams,
  ProviderVerificationResult,
  ProviderRefundParams,
  ProviderRefundResult,
  WebhookVerificationResult,
} from '../interfaces/payment-provider.interface.js';

@Injectable()
export class RazorpayPaymentProvider implements IPaymentProvider {
  public readonly providerName = 'razorpay';
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(private readonly configService: ConfigService) {}

  private get authHeader(): string {
    const keyId = this.configService.razorpayKeyId;
    const keySecret = this.configService.razorpayKeySecret;
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  public async createPaymentSession(
    params: CreatePaymentSessionParams,
  ): Promise<ProviderPaymentSession> {
    const amountInSmallestUnit = Math.round(parseFloat(params.amount) * 100);

    const payload = {
      amount: amountInSmallestUnit,
      currency: params.currency.toUpperCase(),
      receipt: params.paymentId.substring(0, 40),
      notes: {
        paymentId: params.paymentId,
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        ...(params.metadata ? (params.metadata as Record<string, string>) : {}),
      },
    };

    // If API credentials are not configured, log warning and throw actionable error
    if (!this.configService.razorpayKeyId || !this.configService.razorpayKeySecret) {
      this.logger.error('Razorpay credentials missing in environment.');
      throw new Error('Razorpay payment gateway not configured (missing RAZORPAY_KEY_ID/SECRET)');
    }

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Failed to create Razorpay order: ${response.status} ${errorText}`);
      throw new Error(`Razorpay order creation failed: ${response.statusText}`);
    }

    const order = (await response.json()) as { id: string; amount: number; currency: string };

    return {
      providerPaymentId: order.id,
      clientSecret: order.id,
      status: 'PENDING',
      rawResponse: order,
    };
  }

  public async verifyPayment(params: VerifyPaymentParams): Promise<ProviderVerificationResult> {
    const { providerPaymentId, signature, rawPayload } = params;

    // Check signature if provided
    if (signature && this.configService.razorpayKeySecret) {
      const razorpayPaymentId =
        typeof rawPayload?.razorpay_payment_id === 'string'
          ? (rawPayload.razorpay_payment_id as string)
          : '';
      const orderId =
        typeof rawPayload?.razorpay_order_id === 'string'
          ? (rawPayload.razorpay_order_id as string)
          : providerPaymentId;

      if (razorpayPaymentId) {
        const expectedSignature = createHmac('sha256', this.configService.razorpayKeySecret)
          .update(`${orderId}|${razorpayPaymentId}`)
          .digest('hex');

        const sigBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (
          sigBuffer.length !== expectedBuffer.length ||
          !timingSafeEqual(sigBuffer, expectedBuffer)
        ) {
          this.logger.warn(`Razorpay payment signature mismatch for order ${orderId}`);
          return {
            verified: false,
            providerPaymentId,
            status: 'FAILED',
            failureReason: 'Cryptographic signature mismatch',
          };
        }
      }
    }

    // Verify state with upstream Razorpay API
    try {
      const targetId =
        typeof rawPayload?.razorpay_payment_id === 'string'
          ? (rawPayload.razorpay_payment_id as string)
          : providerPaymentId;

      const verification = await this.fetchPayment(targetId);
      return verification;
    } catch (err) {
      this.logger.error(`Error verifying Razorpay payment: ${(err as Error).message}`);
      return {
        verified: false,
        providerPaymentId,
        status: 'FAILED',
        failureReason: (err as Error).message,
      };
    }
  }

  public async fetchPayment(providerPaymentId: string): Promise<ProviderVerificationResult> {
    if (!this.configService.razorpayKeyId || !this.configService.razorpayKeySecret) {
      throw new Error('Razorpay credentials missing in environment.');
    }

    // ProviderPaymentId may be either an order id (order_xxx) or payment id (pay_xxx)
    const endpoint = providerPaymentId.startsWith('order_')
      ? `${this.baseUrl}/orders/${providerPaymentId}/payments`
      : `${this.baseUrl}/payments/${providerPaymentId}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Razorpay fetch payment failed: ${response.status} ${errorText}`);
      throw new Error(`Razorpay fetch payment failed: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>;

    // Handle order payment list vs single payment object
    const payment = Array.isArray((data as { items?: unknown[] }).items)
      ? (data as { items: Array<Record<string, unknown>> }).items[0]
      : data;

    if (!payment) {
      return {
        verified: false,
        providerPaymentId,
        status: 'PENDING',
        failureReason: 'No payments recorded against order yet',
      };
    }

    const paymentStatus = String(payment.status || '').toLowerCase();
    const isCaptured = paymentStatus === 'captured';
    const isFailed = paymentStatus === 'failed';

    const amount =
      typeof payment.amount === 'number' ? (payment.amount / 100).toFixed(2) : undefined;

    return {
      verified: isCaptured,
      providerPaymentId: String(payment.id || providerPaymentId),
      status: isCaptured ? 'SUCCEEDED' : isFailed ? 'FAILED' : 'PENDING',
      amount,
      currency: typeof payment.currency === 'string' ? payment.currency : 'INR',
      failureReason:
        typeof payment.error_description === 'string' ? payment.error_description : undefined,
      rawResponse: payment,
    };
  }

  public async refundPayment(params: ProviderRefundParams): Promise<ProviderRefundResult> {
    if (!this.configService.razorpayKeyId || !this.configService.razorpayKeySecret) {
      throw new Error('Razorpay credentials missing in environment.');
    }

    const amountInSmallestUnit = Math.round(parseFloat(params.amount) * 100);

    const payload = {
      amount: amountInSmallestUnit,
      notes: {
        refundId: params.refundId,
        paymentId: params.paymentId,
        reason: params.reason || 'Patient refund request',
      },
    };

    const response = await fetch(`${this.baseUrl}/payments/${params.providerPaymentId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Razorpay refund failed: ${response.status} ${errorText}`);
      return {
        providerRefundId: `rfnd_failed_${Date.now()}`,
        status: 'FAILED',
        failureReason: `Razorpay refund API error: ${response.statusText}`,
      };
    }

    const refund = (await response.json()) as { id: string; status: string };

    return {
      providerRefundId: refund.id,
      status: refund.status === 'processed' ? 'SUCCEEDED' : 'PROCESSING',
      rawResponse: refund as Record<string, unknown>,
    };
  }

  public async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: string | Buffer,
  ): Promise<WebhookVerificationResult> {
    const signature =
      (headers['x-razorpay-signature'] as string | undefined) ||
      (headers['X-Razorpay-Signature'] as string | undefined);

    const webhookSecret = this.configService.razorpayWebhookSecret;

    if (!signature || !webhookSecret) {
      return {
        valid: false,
        providerEventId: 'invalid-event',
        eventType: 'unknown',
        status: 'FAILED',
        failureReason: 'Missing webhook signature or server secret',
      };
    }

    const rawString = typeof payload === 'string' ? payload : payload.toString('utf-8');
    const expectedSignature = createHmac('sha256', webhookSecret).update(rawString).digest('hex');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      this.logger.warn('Razorpay webhook HMAC signature validation failed');
      return {
        valid: false,
        providerEventId: 'invalid-sig',
        eventType: 'signature_mismatch',
        status: 'FAILED',
        failureReason: 'Webhook HMAC signature mismatch',
      };
    }

    let parsed: {
      event?: string;
      payload?: {
        payment?: { entity?: Record<string, unknown> };
        refund?: { entity?: Record<string, unknown> };
      };
    };

    try {
      parsed = JSON.parse(rawString);
    } catch {
      return {
        valid: false,
        providerEventId: 'malformed-json',
        eventType: 'parse_error',
        status: 'FAILED',
        failureReason: 'Malformed webhook JSON payload',
      };
    }

    const eventType = String(parsed.event || '');
    const paymentEntity = parsed.payload?.payment?.entity;
    const refundEntity = parsed.payload?.refund?.entity;
    const targetEntity = paymentEntity || refundEntity;

    const notes = (targetEntity?.notes as Record<string, unknown> | undefined) || {};
    const paymentId = typeof notes.paymentId === 'string' ? notes.paymentId : undefined;
    const providerPaymentId =
      typeof targetEntity?.id === 'string'
        ? (targetEntity.id as string)
        : typeof refundEntity?.payment_id === 'string'
          ? (refundEntity.payment_id as string)
          : undefined;

    let status: 'SUCCEEDED' | 'FAILED' | 'PENDING' | undefined = undefined;
    if (eventType === 'payment.captured' || eventType === 'refund.processed') {
      status = 'SUCCEEDED';
    } else if (eventType === 'payment.failed' || eventType === 'refund.failed') {
      status = 'FAILED';
    }

    const amount =
      typeof targetEntity?.amount === 'number'
        ? ((targetEntity.amount as number) / 100).toFixed(2)
        : undefined;
    const currency =
      typeof targetEntity?.currency === 'string' ? (targetEntity.currency as string) : undefined;

    return {
      valid: true,
      providerEventId: `${eventType}_${providerPaymentId || Date.now()}`,
      eventType,
      paymentId,
      providerPaymentId,
      status,
      amount,
      currency,
      rawEvent: parsed as Record<string, unknown>,
    };
  }
}
