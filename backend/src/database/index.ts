// ==============================================================================
// MANVIA — Database Layer Public Exports
// ==============================================================================

export { DatabaseModule } from './database.module.js';
export { PrismaService } from './prisma.service.js';
export type {
  TransactionClient,
  DatabaseHealthResult,
  ITransactionalRepository,
  TransactionOptions,
} from './database.interface.js';
