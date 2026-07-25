import { Injectable } from '@nestjs/common';

@Injectable()
export class LogRetentionConfig {
  readonly enabled =
    process.env.LOG_RETENTION_ENABLED?.toLowerCase() !== 'false';
  readonly retentionDays = Number(process.env.LOG_RETENTION_DAYS) || 30;
  readonly batchSize = Number(process.env.LOG_RETENTION_BATCH_SIZE) || 5_000;
  readonly maxBatchesPerRun =
    Number(process.env.LOG_RETENTION_MAX_BATCHES) || 400;
  readonly maxRunTimeMs =
    Number(process.env.LOG_RETENTION_MAX_RUN_MS) || 3_300_000;
}
