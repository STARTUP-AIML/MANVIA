// ==============================================================================
// MANVIA — Database Layer Interfaces & Architectural Contracts
// ==============================================================================
// Phase 3 Foundation: PostgreSQL + Prisma Data Access Boundaries
// ==============================================================================

import type { PrismaClient } from '@prisma/client';
import type { ComponentHealth } from '../health/health.interface.js';

/**
 * Type-safe representation of an active Prisma interactive transaction client.
 * Repositories must accept this client optionally to participate in atomic units of work.
 */
export type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * Standard health indicator response for database connectivity.
 */
export type DatabaseHealthResult = ComponentHealth;

/**
 * Base repository contract defining standard transactional boundaries.
 * Future domain modules (Patients, Doctors, Appointments, etc.) must implement
 * concrete repositories adhering to this pattern without exposing raw database drivers.
 *
 * Architecture Convention:
 *   Controller
 *       ↓
 *   Domain Service
 *       ↓
 *   Repository / Data Access Boundary (receives optional TransactionClient)
 *       ↓
 *   PrismaService
 *       ↓
 *   PostgreSQL 18.x
 */
export interface ITransactionalRepository {
  /**
   * Returns a scoped repository instance bound to an active transaction client,
   * or returns the default repository when no transaction is active.
   */
  withTransaction?(tx: TransactionClient): this;
}

/**
 * Transaction execution options.
 */
export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
}
