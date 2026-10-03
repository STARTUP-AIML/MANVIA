import type { PricingBreakdown } from '../entities/pricing-breakdown.entity.js';

export const PRICING_STRATEGY = Symbol('PRICING_STRATEGY');

export interface PricingCalculationContext {
  baseAmount: string;
  currency: string;
  doctorId: string;
  patientId: string;
  consultationType?: string;
  jurisdiction?: string;
}

export interface IPricingStrategy {
  calculateBreakdown(context: PricingCalculationContext): Promise<PricingBreakdown>;
}
