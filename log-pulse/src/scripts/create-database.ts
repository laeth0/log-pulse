import 'reflect-metadata';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function createDatabase(): Promise<void> {
  const dbName = process.env.DB_NAME ?? 'log_pulse';

  // Connect to the default 'postgres' database to issue CREATE DATABASE
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
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (result.rowCount && result.rowCount > 0) {
      console.log(`Database "${dbName}" already exists — skipping creation.`);
    } else {
      // Database names cannot be parameterised in CREATE DATABASE
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Database "${dbName}" created successfully.`);
    }
  } finally {
    await client.end();
  }
}

createDatabase().catch((err) => {
  console.error('Failed to create database:', err.message);
  process.exit(1);
});
