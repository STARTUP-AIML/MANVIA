// ==============================================================================
// MANVIA — Production RazorpayX Payout Provider (M8)
// ==============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service.js';
import type {
  IPayoutProvider,
  CreatePayoutParams,
  ProviderPayoutResult,
} from '../interfaces/payout-provider.interface.js';

@Injectable()
export class RazorpayPayoutProvider implements IPayoutProvider {
  public readonly providerName = 'razorpayx';
  private readonly logger = new Logger(RazorpayPayoutProvider.name);
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(private readonly configService: ConfigService) {}

  private get authHeader(): string {
    const keyId = this.configService.razorpayKeyId;
    const keySecret = this.configService.razorpayKeySecret;
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
  }

  public async createPayout(params: CreatePayoutParams): Promise<ProviderPayoutResult> {
    const amountInSmallestUnit = Math.round(parseFloat(params.amount) * 100);

    // If Razorpay API credentials are not set, record failure or throw
    if (!this.configService.razorpayKeyId || !this.configService.razorpayKeySecret) {
      this.logger.error('Razorpay credentials missing for payout execution.');
      throw new Error('RazorpayX payout provider not configured (missing credentials)');
    }

    const payload = {
      account_number: '2323230041387701', // Virtual account / pool account
      amount: amountInSmallestUnit,
      currency: params.currency.toUpperCase(),
      mode: 'NEFT',
      purpose: 'payout',
      reference_id: params.payoutId.substring(0, 40),
      narration: `MANVIA Physician Payout ${params.appointmentId}`,
      notes: {
        payoutId: params.payoutId,
        doctorId: params.doctorId,
        appointmentId: params.appointmentId,
      },
    };

    const response = await fetch(`${this.baseUrl}/payouts`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...(params.idempotencyKey ? { 'X-Payout-Idempotency': params.idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`RazorpayX payout creation failed: ${response.status} ${errorText}`);
      return {
        providerPayoutId: `po_failed_${Date.now()}`,
        status: 'FAILED',
        failureReason: `RazorpayX API error: ${response.statusText}`,
      };
    }

    const data = (await response.json()) as { id: string; status: string };

    let status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' = 'PROCESSING';
    if (data.status === 'processed') status = 'PAID';
    else if (data.status === 'rejected' || data.status === 'cancelled') status = 'FAILED';

    return {
      providerPayoutId: data.id,
      status,
      rawResponse: data as Record<string, unknown>,
    };
  }

  public async fetchPayout(providerPayoutId: string): Promise<ProviderPayoutResult> {
    if (!this.configService.razorpayKeyId || !this.configService.razorpayKeySecret) {
      throw new Error('Razorpay credentials missing in environment.');
    }

    const response = await fetch(`${this.baseUrl}/payouts/${providerPayoutId}`, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`RazorpayX fetch payout failed: ${response.status} ${errorText}`);
      throw new Error(`RazorpayX fetch payout failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { id: string; status: string; failure_reason?: string };

    let status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' = 'PROCESSING';
    if (data.status === 'processed') status = 'PAID';
    else if (data.status === 'rejected' || data.status === 'cancelled') status = 'FAILED';

    return {
      providerPayoutId: data.id,
      status,
      ...(data.failure_reason ? { failureReason: data.failure_reason } : {}),
      rawResponse: data as Record<string, unknown>,
    };
  }
}
