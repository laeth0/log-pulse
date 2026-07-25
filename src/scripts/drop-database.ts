import 'reflect-metadata';

import { Client as PgClient } from 'pg';

import {
  assertDatabaseDropAllowed,
  createAdminClientOptions,
  describeError,
  quoteDatabaseIdentifier,
} from './database-admin';

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
