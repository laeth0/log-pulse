import { z } from 'zod';

const LOG_RETENTION_SCHEMA = z.object({
  cron: z.string().trim().min(1).default('0 0 * * * *'),
  retentionDays: z.coerce.number().int().positive().default(30),
  batchSize: z.coerce.number().int().positive().max(10_000).default(5_000),
  maxBatches: z.coerce.number().int().positive().max(10_000).default(400),
  maxRunMilliseconds: z.coerce
    .number()
    .int()
    .positive()
    .max(3_599_999)
    .default(3_300_000),
});

export type LogRetentionConfiguration = z.infer<typeof LOG_RETENTION_SCHEMA>;

export function parseLogRetentionConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): LogRetentionConfiguration {
  return LOG_RETENTION_SCHEMA.parse({
    cron: environment.LOG_RETENTION_CRON,
    retentionDays: environment.LOG_RETENTION_DAYS,
    batchSize: environment.LOG_RETENTION_BATCH_SIZE,
    maxBatches: environment.LOG_RETENTION_MAX_BATCHES,
    maxRunMilliseconds: environment.LOG_RETENTION_MAX_RUN_MS,
  });
}
