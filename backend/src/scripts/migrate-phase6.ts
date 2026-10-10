import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/manvia_dev?schema=public';
const pool = new pg.Pool({ connectionString });

async function run() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve(
      'prisma/migrations/20261010180000_phase6_indian_demo_doctors/migration.sql',
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
