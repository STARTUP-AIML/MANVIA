import { Injectable } from '@nestjs/common';
import type {
  IPricingStrategy,
  PricingCalculationContext,
} from '../interfaces/pricing-strategy.interface.js';
import type { PricingBreakdown } from '../entities/pricing-breakdown.entity.js';
import { CurrencyUtil } from '../utils/currency.util.js';

export interface PricingConfig {
  defaultPlatformFeePercent: number; // e.g. 15 for 15%
  defaultProviderFeePercent: number; // e.g. 2.5 for 2.5%
  defaultTaxPercent: number; // e.g. 0 or 18
  discountPercent?: number;
}

@Injectable()
export class PricingService implements IPricingStrategy {
  private config: PricingConfig = {
    defaultPlatformFeePercent: 15,
    defaultProviderFeePercent: 2.5,
    defaultTaxPercent: 0, // Configurable; commercial/legal tax rate unresolved
    discountPercent: 0,
  };

  public setConfig(newConfig: Partial<PricingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): PricingConfig {
    return { ...this.config };
  }

  public async calculateBreakdown(context: PricingCalculationContext): Promise<PricingBreakdown> {
    const baseMinor = CurrencyUtil.toMinorUnits(context.baseAmount);

    // Apply any discount
    const discountPercent = this.config.discountPercent ?? 0;
    const discountMinor = Math.round((baseMinor * discountPercent) / 100);
    const taxableMinor = Math.max(0, baseMinor - discountMinor);

    // Calculate tax on taxable amount
    const taxMinor = Math.round((taxableMinor * this.config.defaultTaxPercent) / 100);

    // Total patient payment
    const totalMinor = taxableMinor + taxMinor;

    // Platform fee taken from the base consultation fee
    const platformFeeMinor = Math.round((baseMinor * this.config.defaultPlatformFeePercent) / 100);

    // Provider payment processing fee
    const providerFeeMinor = Math.round((baseMinor * this.config.defaultProviderFeePercent) / 100);

    // Doctor share is base amount minus platform fee and provider fee
    const doctorShareMinor = Math.max(0, baseMinor - platformFeeMinor - providerFeeMinor);

    return {
      baseAmount: CurrencyUtil.toDecimalString(baseMinor),
      discount: CurrencyUtil.toDecimalString(discountMinor),
      taxableAmount: CurrencyUtil.toDecimalString(taxableMinor),
      tax: CurrencyUtil.toDecimalString(taxMinor),
      platformFee: CurrencyUtil.toDecimalString(platformFeeMinor),
      providerFee: CurrencyUtil.toDecimalString(providerFeeMinor),
      doctorShare: CurrencyUtil.toDecimalString(doctorShareMinor),
      total: CurrencyUtil.toDecimalString(totalMinor),
      currency: context.currency || 'USD',
    };
  }
}
