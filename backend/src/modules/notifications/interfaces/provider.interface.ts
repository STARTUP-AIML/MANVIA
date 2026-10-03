export interface EmailMessage {
  recipientEmail: string;
  recipientName?: string | undefined;
  subject: string;
  bodyText: string;
  bodyHtml?: string | undefined;
  locale?: string | undefined;
  idempotencyKey?: string | undefined;
  correlationId?: string | undefined;
}

export interface PushMessage {
  pushToken: string;
  title: string;
  body: string;
  data?: Record<string, string> | undefined;
  idempotencyKey?: string | undefined;
}

export interface SmsMessage {
  phoneNumber: string;
  bodyText: string;
  idempotencyKey?: string | undefined;
}

export interface ProviderDeliveryResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  failureCode?: string;
  failureReason?: string;
  isRetryable: boolean;
}

export interface IEmailProvider {
  readonly providerName: string;
  send(message: EmailMessage): Promise<ProviderDeliveryResult>;
}

export interface IPushProvider {
  readonly providerName: string;
  send(message: PushMessage): Promise<ProviderDeliveryResult>;
}

export interface ISmsProvider {
  readonly providerName: string;
  send(message: SmsMessage): Promise<ProviderDeliveryResult>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');
export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
