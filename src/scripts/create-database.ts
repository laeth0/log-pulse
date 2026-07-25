import 'reflect-metadata';

import { Client as PgClient } from 'pg';

import {
  createAdminClientOptions,
  describeError,
  quoteDatabaseIdentifier,
} from './database-admin';

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
