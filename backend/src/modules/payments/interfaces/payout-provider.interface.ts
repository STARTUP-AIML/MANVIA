export const PAYOUT_PROVIDER = Symbol('PAYOUT_PROVIDER');

export interface CreatePayoutParams {
  payoutId: string;
  doctorId: string;
  amount: string;
  currency: string;
  appointmentId: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderPayoutResult {
  providerPayoutId: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  failureReason?: string;
  rawResponse?: Record<string, unknown>;
}

export interface IPayoutProvider {
  readonly providerName: string;
  createPayout(params: CreatePayoutParams): Promise<ProviderPayoutResult>;
  fetchPayout(providerPayoutId: string): Promise<ProviderPayoutResult>;
}
