import * as path from 'path';

import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function dropDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME;

  // DROP DATABASE cannot target the connected database, so use PostgreSQL's
  // maintenance database for this operation.
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT
      ? Number.parseInt(process.env.DB_PORT, 10)
      : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  try {
    // PostgreSQL 13+ terminates existing connections while dropping the
    // database as part of the same statement.
    await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    console.log(`✅ Database "${dbName}" dropped`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  dropDatabase().catch((error: unknown) => {
    console.error('❌ Failed to drop database:', error);
    process.exit(1);
  });
}
