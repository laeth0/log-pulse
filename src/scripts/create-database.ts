import 'reflect-metadata';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { Client as PgClient } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function createDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME ?? 'log_pulse';

  // Connect to the default 'postgres' database to issue CREATE DATABASE
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
    const existingDatabaseResult = await Client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (
      existingDatabaseResult.rowCount &&
      existingDatabaseResult.rowCount > 0
    ) {
      console.log(`Database "${dbName}" already exists — skipping creation.`);
    } else {
      // Database names cannot be parameterised in CREATE DATABASE
      await Client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database "${dbName}" created successfully.`);
    }
  } finally {
    await Client.end();
  }
}

createDatabase().catch((error: Error) => {
  console.error('Failed to create database:', error.message);
  process.exit(1);
});
