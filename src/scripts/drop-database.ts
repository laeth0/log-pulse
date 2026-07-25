import 'reflect-metadata';

import { Client as PgClient } from 'pg';

import { loadConfiguration } from '../config/configuration';
import {
  assertDatabaseDropAllowed,
  createAdminClientOptions,
  describeError,
  quoteDatabaseIdentifier,
} from './database-admin';

async function dropDatabase(): Promise<void> {
  const configuration = loadConfiguration();
  assertDatabaseDropAllowed(configuration);

  const databaseName = configuration.database.name;
  const quotedDatabaseName = quoteDatabaseIdentifier(databaseName);
  const client = new PgClient(createAdminClientOptions(configuration));

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
