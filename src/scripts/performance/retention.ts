import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { AppModule } from '../../app.module';
import { LogRetentionConfig } from '../../logs/retention/log-retention.config';
import { LogRetentionScheduler } from '../../logs/retention/log-retention.scheduler';
import { readPositiveInteger } from './arguments';
import { hasFlag } from './arguments';

async function benchmarkRetention(): Promise<void> {
  const expiredRows = readPositiveInteger('expired-rows', 100_000);
  const skipSeed = hasFlag('skip-seed');
  const seedOnly = hasFlag('seed-only');
  if (process.env.ALLOW_PERFORMANCE_RESET !== 'true') {
    throw new Error(
      'Set ALLOW_PERFORMANCE_RESET=true before generating expired rows',
    );
  }

  const application = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = application.get(DataSource);
    const retentionConfig = application.get(LogRetentionConfig);
    const scheduler = application.get(LogRetentionScheduler);
    const before = await readDatabaseMetrics(dataSource);

    if (!skipSeed) {
      await dataSource.query(
        `
        INSERT INTO logs (timestamp, level, service, message, attributes)
        SELECT
          now() - (($1 + 1) * interval '1 day'),
          'info',
          'retention-benchmark',
          'expired retention benchmark row ' || entry_number,
          jsonb_build_object('expired', true, 'sequence', entry_number)
        FROM generate_series(1, $2::bigint) AS entry_number
      `,
        [retentionConfig.retentionDays, expiredRows],
      );
    }

    if (seedOnly) {
      process.stdout.write(
        `${JSON.stringify({ seededExpiredRows: expiredRows }, null, 2)}\n`,
      );
      return;
    }

    const result = await scheduler.runNow();
    const after = await readDatabaseMetrics(dataSource);
    const evidence = {
      capturedAt: new Date().toISOString(),
      expiredRows,
      retentionConfiguration: retentionConfig,
      result,
      database: { before, after },
    };
    const outputDirectory = path.resolve('docs/performance/results');
    await mkdir(outputDirectory, { recursive: true });
    await writeFile(
      path.join(outputDirectory, 'retention-latest.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8',
    );
    process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await application.close();
  }
}

async function readDatabaseMetrics(dataSource: DataSource): Promise<unknown> {
  return dataSource.query(`
    SELECT
      pg_total_relation_size('logs')::bigint::text AS total_relation_bytes,
      pg_relation_size('logs')::bigint::text AS table_bytes,
      COALESCE(n_live_tup, 0)::bigint::text AS estimated_live_rows,
      COALESCE(n_dead_tup, 0)::bigint::text AS estimated_dead_rows,
      (SELECT wal_bytes::text FROM pg_stat_wal) AS wal_bytes
    FROM pg_stat_user_tables
    WHERE relname = 'logs'
  `);
}

void benchmarkRetention().catch((error: unknown) => {
  process.stderr.write(
    `Retention benchmark failed: ${
      error instanceof Error ? error.message : 'unknown error'
    }\n`,
  );
  process.exitCode = 1;
});
