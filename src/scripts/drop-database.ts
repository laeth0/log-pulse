import 'dotenv/config';

import { Client as PgClient } from 'pg';
import type { ClientConfig } from 'pg';

const SIMPLE_POSTGRES_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

async function dropDatabase(): Promise<void> {
  assertDatabaseDropAllowed();

  const databaseName = process.env.DB_NAME ?? 'log_pulse';
  const quotedDatabaseName = quoteDatabaseIdentifier(databaseName);
  const client = new PgClient(createAdminClientOptions());

  await client.connect();

  try {
    await client.query(
      `
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `,
      [databaseName],
    );

    await client.query(`DROP DATABASE IF EXISTS ${quotedDatabaseName}`);
    console.log(`Database "${databaseName}" dropped successfully.`);
  } finally {
    await client.end();
  }
}

dropDatabase().catch((error: unknown) => {
  console.error('Failed to drop database:', describeError(error));
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

function assertDatabaseDropAllowed(): void {
  if (process.env.ALLOW_DATABASE_DROP !== 'true') {
    throw new Error(
      'Database deletion is disabled; set ALLOW_DATABASE_DROP=true explicitly',
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database deletion is forbidden in production');
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
