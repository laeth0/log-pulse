import 'dotenv/config';

import type { ClientConfig } from 'pg';

const SIMPLE_POSTGRES_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function createAdminClientOptions(): ClientConfig {
  return {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? '',
    database: 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

export function quoteDatabaseIdentifier(databaseName: string): string {
  if (!SIMPLE_POSTGRES_IDENTIFIER.test(databaseName)) {
    throw new Error('DB_NAME must be a simple PostgreSQL identifier');
  }

  return `"${databaseName}"`;
}

export function assertDatabaseDropAllowed(): void {
  if (process.env.ALLOW_DATABASE_DROP !== 'true') {
    throw new Error(
      'Database deletion is disabled; set ALLOW_DATABASE_DROP=true explicitly',
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database deletion is forbidden in production');
  }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
