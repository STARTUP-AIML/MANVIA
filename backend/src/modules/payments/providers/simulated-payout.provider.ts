import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type {
  IPayoutProvider,
  CreatePayoutParams,
  ProviderPayoutResult,
} from '../interfaces/payout-provider.interface.js';

@Injectable()
export class SimulatedPayoutProvider implements IPayoutProvider {
  public readonly providerName = 'simulated';
  private readonly logger = new Logger(SimulatedPayoutProvider.name);

  private readonly payouts = new Map<string, ProviderPayoutResult>();

  public async createPayout(params: CreatePayoutParams): Promise<ProviderPayoutResult> {
    const providerPayoutId = `sim_po_${randomBytes(12).toString('hex')}`;
    this.logger.log(
      `Created simulated payout ${providerPayoutId} to doctor ${params.doctorId} for amount ${params.amount}`,
    );

    const result: ProviderPayoutResult = {
      providerPayoutId,
      status: 'PAID',
      rawResponse: {
        id: providerPayoutId,
        doctorId: params.doctorId,
        amount: params.amount,
        currency: params.currency,
        created: Date.now(),
      },
    };

    this.payouts.set(providerPayoutId, result);
    return result;
  }

  public async fetchPayout(providerPayoutId: string): Promise<ProviderPayoutResult> {
    const payout = this.payouts.get(providerPayoutId);
    if (!payout) {
      return {
        providerPayoutId,
        status: 'FAILED',
        failureReason: 'Payout not found in simulated provider',
      };
    }
    return payout;
  }
}
