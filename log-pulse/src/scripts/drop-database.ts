import 'reflect-metadata';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function dropDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME ?? 'log_pulse';

  // Connect to the default 'postgres' database to issue DROP DATABASE
  const client = new Client({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? '',
    database: 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  try {
    // Terminate active connections before dropping so it doesn't block
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);

    // Database names cannot be parameterised in DROP DATABASE
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✓ Database "${dbName}" dropped successfully.`);
  } finally {
    await client.end();
  }
}

dropDatabase().catch((err) => {
  console.error('Failed to drop database:', err.message);
  process.exit(1);
});
