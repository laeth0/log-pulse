import type { ClientConfig } from 'pg';

import type { ApplicationConfiguration } from '../config/configuration';

const SIMPLE_POSTGRES_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function createAdminClientOptions(
  configuration: ApplicationConfiguration,
): ClientConfig {
  return {
    host: configuration.database.host,
    port: configuration.database.port,
    user: configuration.database.username,
    password: configuration.database.password,
    database: 'postgres',
    ssl: configuration.database.ssl ? { rejectUnauthorized: false } : false,
  };
}

export function quoteDatabaseIdentifier(databaseName: string): string {
  if (!SIMPLE_POSTGRES_IDENTIFIER.test(databaseName)) {
    throw new Error('DB_NAME must be a simple PostgreSQL identifier');
  }

  return `"${databaseName}"`;
}

export function assertDatabaseDropAllowed(
  configuration: ApplicationConfiguration,
): void {
  if (!configuration.databaseAdministration.allowDrop) {
    throw new Error(
      'Database deletion is disabled; set ALLOW_DATABASE_DROP=true explicitly',
    );
  }

  if (configuration.application.environment === 'production') {
    throw new Error('Database deletion is forbidden in production');
  }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
