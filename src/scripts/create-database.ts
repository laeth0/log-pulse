import 'dotenv/config';

import { Client as PgClient } from 'pg';
import type { ClientConfig } from 'pg';

const SIMPLE_POSTGRES_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

async function createDatabase(): Promise<void> {
  const databaseName = process.env.DB_NAME ?? 'log_pulse';
  const quotedDatabaseName = quoteDatabaseIdentifier(databaseName);
  const client = new PgClient(createAdminClientOptions());

  await client.connect();

  try {
    const existingDatabaseResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [databaseName],
    );

    if ((existingDatabaseResult.rowCount ?? 0) > 0) {
      console.log(
        `Database "${databaseName}" already exists — skipping creation.`,
      );
    } else {
      await client.query(`CREATE DATABASE ${quotedDatabaseName}`);
      console.log(`Database "${databaseName}" created successfully.`);
    }
  } finally {
    await client.end();
  }
}

createDatabase().catch((error: unknown) => {
  console.error('Failed to create database:', describeError(error));
  process.exit(1);
});

function createAdminClientOptions(): ClientConfig {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? '',
    database: 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

function quoteDatabaseIdentifier(databaseName: string): string {
  if (!SIMPLE_POSTGRES_IDENTIFIER.test(databaseName)) {
    throw new Error('DB_NAME must be a simple PostgreSQL identifier');
  }

  return `"${databaseName}"`;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
