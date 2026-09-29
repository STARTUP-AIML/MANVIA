import { Injectable } from '@nestjs/common';
import { getEnvConfig, type EnvConfig } from './env.js';

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
}
