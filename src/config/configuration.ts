import 'dotenv/config';

import path from 'node:path';

import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';

import { parseEnvironment } from './environment.schema';

export type ApplicationConfiguration = Readonly<{
  application: Readonly<{
    environment: 'development' | 'test' | 'production';
    port: 8080;
    httpBodyLimitBytes: number;
  }>;
  database: Readonly<{
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
    ssl: boolean;
    poolMaximum: number;
    connectionTimeoutMs: number;
    idleTimeoutMs: number;
  }>;
  retention: Readonly<{
    enabled: boolean;
    days: number;
    batchSize: number;
    maxBatches: number;
    maxRunMs: number;
  }>;
  ingestion: Readonly<{
    chunkSize: number;
  }>;
  databaseAdministration: Readonly<{
    allowDrop: boolean;
    allowPerformanceReset: boolean;
  }>;
}>;

export function loadConfiguration(
  rawEnvironment: NodeJS.ProcessEnv = process.env,
): ApplicationConfiguration {
  const environment = parseEnvironment(rawEnvironment);

  return {
    application: {
      environment: environment.NODE_ENV,
      port: environment.PORT,
      httpBodyLimitBytes: environment.HTTP_BODY_LIMIT_BYTES,
    },
    database: {
      host: environment.DB_HOST,
      port: environment.DB_PORT,
      username: environment.DB_USER,
      password: environment.DB_PASS,
      name: environment.DB_NAME,
      ssl: environment.DB_SSL,
      poolMaximum: environment.DB_POOL_MAX,
      connectionTimeoutMs: environment.DB_CONNECTION_TIMEOUT_MS,
      idleTimeoutMs: environment.DB_IDLE_TIMEOUT_MS,
    },
    retention: {
      enabled: environment.LOG_RETENTION_ENABLED,
      days: environment.LOG_RETENTION_DAYS,
      batchSize: environment.LOG_RETENTION_BATCH_SIZE,
      maxBatches: environment.LOG_RETENTION_MAX_BATCHES,
      maxRunMs: environment.LOG_RETENTION_MAX_RUN_MS,
    },
    ingestion: {
      chunkSize: environment.LOG_INGEST_CHUNK_SIZE,
    },
    databaseAdministration: {
      allowDrop: environment.ALLOW_DATABASE_DROP,
      allowPerformanceReset: environment.ALLOW_PERFORMANCE_RESET,
    },
  };
}

export function createDatabaseOptions(
  configuration: ApplicationConfiguration,
): PostgresDataSourceOptions {
  return {
    type: 'postgres',
    host: configuration.database.host,
    port: configuration.database.port,
    username: configuration.database.username,
    password: configuration.database.password,
    database: configuration.database.name,
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    ssl: configuration.database.ssl ? { rejectUnauthorized: false } : false,
    logging: configuration.application.environment === 'development',
    poolSize: configuration.database.poolMaximum,
    connectTimeoutMS: configuration.database.connectionTimeoutMs,
    extra: {
      idleTimeoutMillis: configuration.database.idleTimeoutMs,
    },
  };
}
