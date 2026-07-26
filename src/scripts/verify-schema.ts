import 'reflect-metadata';

import { AppDataSource } from '../config/data-source';

async function verifySchema(): Promise<void> {
  await AppDataSource.initialize();

  try {
    if (await AppDataSource.showMigrations()) {
      throw new Error('Database has pending migrations');
    }

    const verification: unknown = await AppDataSource.query(`
      SELECT
        to_regclass('public.logs') IS NOT NULL
        AND (
          SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
          FROM pg_enum
          WHERE enumtypid = 'logs_level_enum'::regtype
        ) = ARRAY['debug', 'info', 'warn', 'error']
        AND (
          SELECT COUNT(*) = 7
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'logs'
            AND column_name IN (
              'id',
              'timestamp',
              'level',
              'service',
              'message',
              'attributes',
              'created_at'
            )
        )
        AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'logs'
            AND column_name = 'id'
            AND data_type = 'uuid'
            AND column_default = 'gen_random_uuid()'
        )
        AND (
          SELECT COUNT(*) = 4
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'logs'
            AND indexname IN (
              'idx_logs_timestamp_id',
              'idx_logs_service_timestamp_id',
              'idx_logs_level_timestamp_id',
              'idx_logs_message_trgm'
            )
        )
        AS valid
    `);

    if (!readValid(verification)) {
      throw new Error('Database catalog does not match the canonical schema');
    }

    process.stdout.write('Database catalog matches the canonical schema.\n');
  } finally {
    await AppDataSource.destroy();
  }
}

function readValid(result: unknown): boolean {
  if (!Array.isArray(result) || result.length !== 1) {
    return false;
  }

  const row: unknown = result[0];
  return (
    typeof row === 'object' &&
    row !== null &&
    'valid' in row &&
    row.valid === true
  );
}

void verifySchema().catch((error: unknown) => {
  process.stderr.write(
    `Schema verification failed: ${
      error instanceof Error ? error.message : 'unknown error'
    }\n`,
  );
  process.exitCode = 1;
});
