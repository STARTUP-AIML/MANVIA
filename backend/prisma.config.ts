// ==============================================================================
// MANVIA — Prisma 7 Configuration (Prisma CLI & Migration Tooling)
// ==============================================================================

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public',
  },
});
