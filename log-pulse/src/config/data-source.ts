import 'reflect-metadata';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

// Load .env from the project root (two levels up from src/config/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });


export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME ?? 'log_pulse',

  // Pick up all entities under src/ (works for both .ts in dev and .js in prod)
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],

  // Pick up all migration files under src/migrations/
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],

  // Dedicated table so migration history is separate from application tables
  migrationsTableName: 'typeorm_migrations',

  // Never auto-sync in production — always use explicit migrations
  synchronize: false,

  // Optional SSL (e.g. for managed cloud databases)
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

  // Verbose query logging in development only
  logging: process.env.NODE_ENV === 'development',

  // Connection pool settings (fall back to pg defaults when not set)
  poolSize: Number(process.env.DB_POOL_MAX) || undefined,
  connectTimeoutMS: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || undefined,
  extra: {
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || undefined,
  },
});
