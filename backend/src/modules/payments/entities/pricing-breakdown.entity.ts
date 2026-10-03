export interface PricingBreakdown {
  baseAmount: string; // Decimal representation, e.g. "100.00"
  discount: string; // e.g. "0.00"
  taxableAmount: string; // e.g. "100.00"
  tax: string; // e.g. "18.00"
  platformFee: string; // e.g. "15.00"
  providerFee: string; // e.g. "2.50"
  doctorShare: string; // e.g. "82.50"
  total: string; // e.g. "118.00"
  currency: string;
}
