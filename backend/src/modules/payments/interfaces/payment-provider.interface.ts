export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreatePaymentSessionParams {
  paymentId: string;
  amount: string;
  currency: string;
  appointmentId: string;
  patientId: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface ProviderPaymentSession {
  providerPaymentId: string;
  checkoutUrl?: string | undefined;
  clientSecret?: string | undefined;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED';
  rawResponse?: Record<string, unknown> | undefined;
}

export interface VerifyPaymentParams {
  paymentId: string;
  providerPaymentId: string;
  signature?: string | undefined;
  rawPayload?: Record<string, unknown> | undefined;
}

export interface ProviderVerificationResult {
  verified: boolean;
  providerPaymentId: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  amount?: string | undefined;
  currency?: string | undefined;
  failureReason?: string | undefined;
  rawResponse?: Record<string, unknown> | undefined;
}

export interface ProviderRefundParams {
  paymentId: string;
  providerPaymentId: string;
  refundId: string;
  amount: string;
  currency: string;
  reason?: string | undefined;
}

export interface ProviderRefundResult {
  providerRefundId: string;
  status: 'SUCCEEDED' | 'PROCESSING' | 'FAILED';
  failureReason?: string | undefined;
  rawResponse?: Record<string, unknown> | undefined;
}

export interface WebhookVerificationResult {
  valid: boolean;
  providerEventId: string;
  eventType: string;
  paymentId?: string | undefined;
  providerPaymentId?: string | undefined;
  status?: 'SUCCEEDED' | 'FAILED' | 'PENDING' | undefined;
  amount?: string | undefined;
  currency?: string | undefined;
  failureReason?: string | undefined;
  rawEvent?: Record<string, unknown> | undefined;
}

export interface IPaymentProvider {
  readonly providerName: string;
  createPaymentSession(params: CreatePaymentSessionParams): Promise<ProviderPaymentSession>;
  verifyPayment(params: VerifyPaymentParams): Promise<ProviderVerificationResult>;
  fetchPayment(providerPaymentId: string): Promise<ProviderVerificationResult>;
  refundPayment(params: ProviderRefundParams): Promise<ProviderRefundResult>;
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    payload: string | Buffer,
  ): Promise<WebhookVerificationResult>;
}
