import 'reflect-metadata';

import { AppDataSource } from '../../config/data-source';
import { loadConfiguration } from '../../config/configuration';
import { hasFlag, readPositiveInteger } from './arguments';

async function seed(): Promise<void> {
  const rows = readPositiveInteger('rows', 1_000_000);
  const reset = hasFlag('reset');
  const configuration = loadConfiguration();

  await AppDataSource.initialize();
  try {
    if (await AppDataSource.showMigrations()) {
      throw new Error('Apply all migrations before seeding performance data');
    }

    if (reset) {
      if (!configuration.databaseAdministration.allowPerformanceReset) {
        throw new Error(
          'Set ALLOW_PERFORMANCE_RESET=true before using --reset',
        );
      }
      await AppDataSource.query('TRUNCATE TABLE logs RESTART IDENTITY');
    } else {
      const currentRows: unknown = await AppDataSource.query(
        'SELECT COUNT(*)::int AS count FROM logs',
      );
      if (readCount(currentRows) !== 0) {
        throw new Error(
          'The logs table is not empty; use a disposable database and --reset',
        );
      }
    }

    const startedAt = performance.now();
    await AppDataSource.query(
      `
        INSERT INTO logs (timestamp, level, service, message, attributes)
        SELECT
          now() - ((entry_number % 2592000) * interval '1 second'),
          (ARRAY['debug', 'info', 'warn', 'error']::logs_level_enum[])[
            1 + (entry_number % 4)
          ],
          'service-' || (entry_number % 20),
          'deterministic log message ' || entry_number ||
            CASE WHEN entry_number % 10 = 0 THEN ' searchable-unicode-مرحبا' ELSE '' END,
          jsonb_build_object(
            'user_id', entry_number % 10000,
            'region', 'region-' || (entry_number % 5),
            'enabled', entry_number % 2 = 0
          )
        FROM generate_series(1, $1::bigint) AS entry_number
      `,
      [rows],
    );
    await AppDataSource.query('ANALYZE logs');
    const durationMs = performance.now() - startedAt;

    process.stdout.write(
      `${JSON.stringify(
        {
          rows,
          durationMs: Math.round(durationMs * 100) / 100,
          rowsPerSecond: Math.round((rows * 1_000) / durationMs),
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}

function readCount(result: unknown): number {
  if (!Array.isArray(result) || result.length !== 1) {
    throw new Error('PostgreSQL returned an invalid row count');
  }

  const row: unknown = result[0];
  if (typeof row !== 'object' || row === null || !('count' in row)) {
    throw new Error('PostgreSQL returned an invalid row count');
  }

  const count = row.count;
  if (typeof count !== 'number' || !Number.isSafeInteger(count)) {
    throw new Error('PostgreSQL returned an invalid row count');
  }

  return count;
}

void seed().catch((error: unknown) => {
  process.stderr.write(
    `Performance seed failed: ${
      error instanceof Error ? error.message : 'unknown error'
    }\n`,
  );
  process.exitCode = 1;
});
