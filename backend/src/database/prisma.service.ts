// ==============================================================================
// MANVIA — Prisma Client Service Provider
// ==============================================================================
// Baseline: PostgreSQL 18.x, Prisma 7.x
// Connection pooling managed via pg.Pool + @prisma/adapter-pg
// Lifecycle integration with NestJS (OnModuleInit, OnApplicationShutdown)
// ==============================================================================

import { Injectable, Logger, type OnModuleInit, type OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { ConfigService } from '../config/config.service.js';
import type { ComponentHealth } from '../health/health.interface.js';
import type { TransactionClient, TransactionOptions } from './database.interface.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;
  private connected = false;

  constructor(private readonly configService: ConfigService) {
    const connectionString = configService.databaseUrl;
    const pool = new pg.Pool({
      connectionString,
      min: configService.databasePoolMin,
      max: configService.databasePoolMax,
      connectionTimeoutMillis: configService.databaseConnectionTimeoutMs,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });

    this.pool = pool;

    // Handle background pool errors to prevent unhandled node process exits
    this.pool.on('error', (err) => {
      this.logger.error(`[PostgreSQL Pool Error] ${err.message}`, err.stack);
    });
  }

  /**
   * Indicates whether the database connection is currently active.
   */
  public get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Initializes database connection during NestJS module bootstrap.
   */
  public async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.connected = true;
      this.logger.log(
        `Database connection established: ${this.configService.sanitizedDatabaseUrl}`,
      );
    } catch (err) {
      this.connected = false;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to establish initial database connection: ${message}`);

      // In production/staging, fail fast if the primary database is unreachable
      if (this.configService.isProduction) {
        throw new Error(`Critical: Cannot connect to PostgreSQL database: ${message}`);
      }
    }
  }

  /**
   * Gracefully tears down connection pool and Prisma engine on application shutdown.
   */
  public async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Closing database connection and pool (shutdown signal: ${signal ?? 'manual'})...`,
    );
    try {
      await this.$disconnect();
    } catch (err) {
      this.logger.warn(
        `Error during Prisma disconnect: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      await this.pool.end();
    } catch (err) {
      this.logger.warn(
        `Error draining connection pool: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    this.connected = false;
    this.logger.log('Database connection pool drained and terminated cleanly.');
  }

  /**
   * Executes a lightweight health check query without logging credentials.
   */
  public async checkHealth(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.$queryRawUnsafe('SELECT 1');
      this.connected = true;
      return {
        status: 'healthy',
        responseTimeMs: Date.now() - start,
        details: {
          dialect: 'postgresql',
          status: 'connected',
        },
      };
    } catch (err) {
      this.connected = false;
      const rawError = err instanceof Error ? err.message : 'Database ping failure';
      // Redact potential connection strings or credentials from error message
      const sanitizedError = rawError.replace(/:\/\/(.*?):(.*?)@/, '://$1:***@');

      return {
        status: 'unhealthy',
        responseTimeMs: Date.now() - start,
        error: sanitizedError,
        details: {
          dialect: 'postgresql',
          status: 'disconnected',
        },
      };
    }
  }

  /**
   * Utility for executing an atomic interactive transaction.
   * Repositories should receive the `tx` TransactionClient to coordinate atomic operations.
   */
  public async executeTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.$transaction(async (tx) => fn(tx), options);
  }
}
