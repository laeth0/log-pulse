import 'reflect-metadata';

import path from 'node:path';

import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  uuidExtension: 'pgcrypto',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? '',
  database: process.env.DB_NAME ?? 'log_pulse',
  entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  migrationsTransactionMode: 'each',
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: process.env.NODE_ENV === 'development',
  poolSize: Number(process.env.DB_POOL_MAX) || undefined,
  connectTimeoutMS: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || undefined,
  extra: {
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || undefined,
  },
});
