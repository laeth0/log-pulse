import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { QueryRunner } from 'typeorm';

import { AppDataSource } from '../../config/data-source';
import { hasFlag } from './arguments';

type ExplainCase = Readonly<{
  name: string;
  sql: string;
  parameters: readonly unknown[];
  rollback?: boolean;
}>;

const cases: readonly ExplainCase[] = [
  {
    name: 'list-default',
    sql: `SELECT id, timestamp, level, service, message, attributes
          FROM logs ORDER BY timestamp DESC, id DESC LIMIT 101`,
    parameters: [],
  },
  {
    name: 'list-time-cursor',
    sql: `SELECT id, timestamp, level, service, message, attributes
          FROM logs
          WHERE timestamp >= $1 AND timestamp < $2
            AND (timestamp, id) < ($3, $4)
          ORDER BY timestamp DESC, id DESC LIMIT 1001`,
    parameters: [
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2100-01-01T00:00:00.000Z'),
      new Date('2100-01-01T00:00:00.000Z'),
      '9223372036854775807',
    ],
  },
  {
    name: 'list-service',
    sql: `SELECT id, timestamp, level, service, message, attributes
          FROM logs
          WHERE service = $1
          ORDER BY timestamp DESC, id DESC LIMIT 1001`,
    parameters: ['service-1'],
  },
  {
    name: 'list-level',
    sql: `SELECT id, timestamp, level, service, message, attributes
          FROM logs WHERE level = $1
          ORDER BY timestamp DESC, id DESC LIMIT 1001`,
    parameters: ['error'],
  },
  {
    name: 'list-message',
    sql: `SELECT id, timestamp, level, service, message, attributes
          FROM logs WHERE message ILIKE $1 ESCAPE '\\'
          ORDER BY timestamp DESC, id DESC LIMIT 101`,
    parameters: ['%999999%'],
  },
  {
    name: 'list-attributes',
    sql: `SELECT id, timestamp, level, service, message, attributes
          FROM logs
          WHERE attributes ->> CAST($1 AS text) = CAST($2 AS text)
          ORDER BY timestamp DESC, id DESC LIMIT 101`,
    parameters: ['user_id', '42'],
  },
  {
    name: 'aggregate-service-5m',
    sql: `SELECT date_bin($1::interval, timestamp, $2::timestamptz) AS start,
                 service AS "group", COUNT(*)::bigint AS count
          FROM logs
          WHERE timestamp >= $3 AND timestamp < $4
          GROUP BY start, service ORDER BY start ASC, service ASC`,
    parameters: [
      '5 minutes',
      '1970-01-01T00:00:00.000Z',
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2100-01-01T00:00:00.000Z'),
    ],
  },
  {
    name: 'aggregate-level-1h',
    sql: `SELECT date_bin($1::interval, timestamp, $2::timestamptz) AS start,
                 level AS "group", COUNT(*)::bigint AS count
          FROM logs
          WHERE timestamp >= $3 AND timestamp < $4
          GROUP BY start, level ORDER BY start ASC, level ASC`,
    parameters: [
      '1 hour',
      '1970-01-01T00:00:00.000Z',
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2100-01-01T00:00:00.000Z'),
    ],
  },
  {
    name: 'aggregate-filter-service-1h',
    sql: `SELECT date_bin($1::interval, timestamp, $2::timestamptz) AS start,
                 COUNT(*)::bigint AS count
          FROM logs
          WHERE service = $3
            AND timestamp >= $4 AND timestamp < $5
          GROUP BY start ORDER BY start ASC`,
    parameters: [
      '1 hour',
      '1970-01-01T00:00:00.000Z',
      'service-1',
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2100-01-01T00:00:00.000Z'),
    ],
  },
  {
    name: 'aggregate-filter-level-1h',
    sql: `SELECT date_bin($1::interval, timestamp, $2::timestamptz) AS start,
                 COUNT(*)::bigint AS count
          FROM logs
          WHERE level = $3 AND timestamp >= $4 AND timestamp < $5
          GROUP BY start ORDER BY start ASC`,
    parameters: [
      '1 hour',
      '1970-01-01T00:00:00.000Z',
      'error',
      new Date('2020-01-01T00:00:00.000Z'),
      new Date('2100-01-01T00:00:00.000Z'),
    ],
  },
  {
    name: 'retention-delete',
    rollback: true,
    sql: `WITH expired_logs AS (
            SELECT id FROM logs WHERE timestamp < $1
            ORDER BY timestamp ASC, id ASC LIMIT $2 FOR UPDATE SKIP LOCKED
          )
          DELETE FROM logs AS log USING expired_logs
          WHERE log.id = expired_logs.id`,
    parameters: [new Date('2100-01-01T00:00:00.000Z'), 5_000],
  },
  {
    name: 'insert-1000',
    rollback: true,
    sql: `INSERT INTO logs (timestamp, level, service, message, attributes)
          SELECT now(), 'info', 'explain', 'explain insertion', '{}'::jsonb
          FROM generate_series(1, 1000)`,
    parameters: [],
  },
];

async function explain(): Promise<void> {
  const validateOnly = hasFlag('validate-only');
  await AppDataSource.initialize();

  try {
    if (await AppDataSource.showMigrations()) {
      throw new Error('Apply all migrations before validating query plans');
    }

    const results: Record<string, unknown> = {};
    for (const explainCase of cases) {
      results[explainCase.name] = await runExplainCase(
        explainCase,
        validateOnly,
      );
    }

    if (!validateOnly) {
      const outputDirectory = path.resolve('docs/performance/explain');
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        path.join(outputDirectory, 'plans-latest.json'),
        `${JSON.stringify(
          {
            capturedAt: new Date().toISOString(),
            node: process.version,
            cases: results,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }

    process.stdout.write(
      `Validated ${cases.length} production query-plan cases${
        validateOnly ? '' : ' and saved plans'
      }.\n`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

async function runExplainCase(
  explainCase: ExplainCase,
  validateOnly: boolean,
): Promise<unknown> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    if (explainCase.rollback) {
      await queryRunner.startTransaction();
    }

    const explainOptions = validateOnly
      ? 'FORMAT JSON'
      : 'ANALYZE, BUFFERS, WAL, SETTINGS, FORMAT JSON';
    return await queryRunner.query(
      `EXPLAIN (${explainOptions}) ${explainCase.sql}`,
      [...explainCase.parameters],
    );
  } finally {
    await rollbackAndRelease(queryRunner);
  }
}

async function rollbackAndRelease(queryRunner: QueryRunner): Promise<void> {
  if (queryRunner.isTransactionActive) {
    await queryRunner.rollbackTransaction();
  }
  if (!queryRunner.isReleased) {
    await queryRunner.release();
  }
}

void explain().catch((error: unknown) => {
  process.stderr.write(
    `EXPLAIN validation failed: ${
      error instanceof Error ? error.message : 'unknown error'
    }\n`,
  );
  process.exitCode = 1;
});
