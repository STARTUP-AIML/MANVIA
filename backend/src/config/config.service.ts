import { Injectable } from '@nestjs/common';
import { getEnvConfig, sanitizeDatabaseUrl, type EnvConfig } from './env.js';

@Injectable()
export class ConfigService {
  private readonly config: EnvConfig;

  constructor() {
    this.config = getEnvConfig();
  }

  public get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  public get raw(): EnvConfig {
    return this.config;
  }

  public get nodeEnv(): string {
    return this.config.NODE_ENV;
  }

  public get port(): number {
    return this.config.PORT;
  }

  public get host(): string {
    return this.config.HOST;
  }

  public get appName(): string {
    return this.config.APP_NAME;
  }

  public get apiPrefix(): string {
    return this.config.API_PREFIX;
  }

  public get corsAllowedOrigins(): string[] {
    return this.config.CORS_ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  public get isSwaggerEnabled(): boolean {
    return this.config.SWAGGER_ENABLED;
  }

  public get swaggerPath(): string {
    return this.config.SWAGGER_PATH;
  }

  public get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  public get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  public get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  // Database Configuration (Phase 3)
  public get databaseUrl(): string {
    if (this.nodeEnv === 'test' && this.config.TEST_DATABASE_URL) {
      return this.config.TEST_DATABASE_URL;
    }
    return this.config.DATABASE_URL;
  }

  public get sanitizedDatabaseUrl(): string {
    return sanitizeDatabaseUrl(this.databaseUrl);
  }

  public get databasePoolMin(): number {
    return this.config.DATABASE_POOL_MIN;
  }

  public get databasePoolMax(): number {
    return this.config.DATABASE_POOL_MAX;
  }

  public get databaseConnectionTimeoutMs(): number {
    return this.config.DATABASE_CONNECTION_TIMEOUT_MS;
  }

  // Authentication & Security (Phase 4)
  public get jwtSecret(): string {
    return this.config.JWT_SECRET;
  }

  public get jwtAccessExpiration(): string {
    return this.config.JWT_ACCESS_EXPIRATION;
  }

  public get jwtRefreshSecret(): string {
    return this.config.JWT_REFRESH_SECRET;
  }

  public get jwtRefreshExpiration(): string {
    return this.config.JWT_REFRESH_EXPIRATION;
  }

  // AI & Realtime Configuration (Milestone 6)
  public get aiProvider(): string {
    return this.config.AI_PROVIDER;
  }

  public get geminiApiKey(): string {
    return this.config.GEMINI_API_KEY || '';
  }

  public get geminiModel(): string {
    return this.config.GEMINI_MODEL;
  }

  public get isAiSafetyEnabled(): boolean {
    return this.config.AI_SAFETY_ENABLED;
  }

  public get aiSafetyProvider(): string {
    return this.config.AI_SAFETY_PROVIDER;
  }

  public get aiSafetyModel(): string {
    return this.config.AI_SAFETY_MODEL;
  }

  public get isRagEnabled(): boolean {
    return this.config.RAG_ENABLED;
  }

  public get ragTopK(): number {
    return this.config.RAG_TOP_K;
  }

  public get ragMinRelevance(): number {
    return this.config.RAG_MIN_RELEVANCE;
  }

  public get embeddingProvider(): string {
    return this.config.EMBEDDING_PROVIDER;
  }

  public get embeddingModel(): string {
    return this.config.EMBEDDING_MODEL;
  }

  public get realtimeProvider(): string {
    return this.config.REALTIME_PROVIDER;
  }

  public get realtimeModel(): string {
    return this.config.REALTIME_MODEL;
  }

  // Payment Processing (Milestone 8)
  public get paymentProvider(): string {
    return this.config.PAYMENT_PROVIDER;
  }

  public get razorpayKeyId(): string {
    return this.config.RAZORPAY_KEY_ID || '';
  }

  public get razorpayKeySecret(): string {
    return this.config.RAZORPAY_KEY_SECRET || '';
  }

  public get razorpayWebhookSecret(): string {
    return this.config.RAZORPAY_WEBHOOK_SECRET || '';
  }

  // External Notifications (Milestone 8)
  public get emailProvider(): string {
    return this.config.EMAIL_PROVIDER;
  }

  public get resendApiKey(): string {
    return this.config.RESEND_API_KEY || '';
  }

  public get emailFrom(): string {
    return this.config.EMAIL_FROM;
  }

  public get smsProvider(): string {
    return this.config.SMS_PROVIDER;
  }

  public get twilioAccountSid(): string {
    return this.config.TWILIO_ACCOUNT_SID || '';
  }

  public get twilioAuthToken(): string {
    return this.config.TWILIO_AUTH_TOKEN || '';
  }

  public get twilioPhoneNumber(): string {
    return this.config.TWILIO_PHONE_NUMBER || '';
  }

  public get pushProvider(): string {
    return this.config.PUSH_PROVIDER;
  }

  public get firebaseProjectId(): string {
    return this.config.FIREBASE_PROJECT_ID || '';
  }

  public get firebaseClientEmail(): string {
    return this.config.FIREBASE_CLIENT_EMAIL || '';
  }

  public get firebasePrivateKey(): string {
    return this.config.FIREBASE_PRIVATE_KEY || '';
  }

  // Observability & URLs (Milestone 8)
  public get sentryDsn(): string {
    return this.config.SENTRY_DSN || '';
  }

  public get frontendUrl(): string {
    return this.config.FRONTEND_URL;
  }
}
