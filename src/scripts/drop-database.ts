import 'reflect-metadata';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { Client as PgClient } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function dropDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME ?? 'log_pulse';

  // Connect to the default 'postgres' database to issue DROP DATABASE
  const Client = new PgClient({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? '',
    database: 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await Client.connect();

  try {
    // Terminate active connections before dropping so it doesn't block
    await Client.query(
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `,
      [dbName],
    );

    // Database names cannot be parameterised in DROP DATABASE
    await Client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✓ Database "${dbName}" dropped successfully.`);
  } finally {
    await Client.end();
  }
}

dropDatabase().catch((error: Error) => {
  console.error('Failed to drop database:', error.message);
  process.exit(1);
});
