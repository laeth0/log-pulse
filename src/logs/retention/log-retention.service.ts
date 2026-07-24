import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

import {
  LOG_RETENTION_ADVISORY_LOCK_ID,
  LOG_RETENTION_CRON_EXPRESSION,
  LOG_RETENTION_JOB_NAME,
} from '../../common/const/log-retention.const';
import { LogRetentionConfig } from './log-retention.config';

type AdvisoryLockRow = Readonly<{ acquired: boolean }>;
type DeletedCountRow = Readonly<{ deleted_count: number }>;

/**
 * Removes expired logs in short transactions so cleanup yields to ingestion.
 * A PostgreSQL advisory lock prevents concurrent runs across service replicas.
 */
@Injectable()
export class LogRetentionService {
  private readonly logger = new Logger(LogRetentionService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly retentionConfig: LogRetentionConfig,
  ) {}

  @Cron(LOG_RETENTION_CRON_EXPRESSION, {
    name: LOG_RETENTION_JOB_NAME,
    waitForCompletion: true,
  })
  async deleteExpiredLogs(): Promise<void> {
    if (!this.retentionConfig.enabled) {
      return;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    let lockAcquired = false;

    try {
      await queryRunner.connect();
      lockAcquired = await this.acquireAdvisoryLock(queryRunner);

      if (!lockAcquired) {
        this.logger.debug('Another replica is running log retention');
        return;
      }

      const expirationThreshold = this.createExpirationThreshold();
      const deletedLogCount = await this.deleteExpiredLogBatches(
        queryRunner,
        expirationThreshold,
      );

      this.logger.log(
        `Log retention deleted ${deletedLogCount} entries older than ${expirationThreshold.toISOString()}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        'Log retention failed',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      if (lockAcquired) {
        await this.releaseAdvisoryLock(queryRunner);
      }

      await queryRunner.release();
    }
  }

  private createExpirationThreshold(): Date {
    const retentionMilliseconds =
      this.retentionConfig.retentionDays * 24 * 60 * 60 * 1_000;

    return new Date(Date.now() - retentionMilliseconds);
  }

  private async deleteExpiredLogBatches(
    queryRunner: QueryRunner,
    expirationThreshold: Date,
  ): Promise<number> {
    let totalDeletedLogCount = 0;

    for (
      let batchNumber = 0;
      batchNumber < this.retentionConfig.maxBatchesPerRun;
      batchNumber += 1
    ) {
      const deletedLogCount = await this.deleteExpiredLogBatch(
        queryRunner,
        expirationThreshold,
      );
      totalDeletedLogCount += deletedLogCount;

      if (deletedLogCount < this.retentionConfig.batchSize) {
        break;
      }
    }

    return totalDeletedLogCount;
  }

  private async deleteExpiredLogBatch(
    queryRunner: QueryRunner,
    expirationThreshold: Date,
  ): Promise<number> {
    const result: unknown = await queryRunner.query(
      `
        WITH expired_logs AS (
          SELECT "id"
          FROM "logs"
          WHERE "timestamp" < $1
          ORDER BY "timestamp" ASC, "id" ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        ),
        deleted_logs AS (
          DELETE FROM "logs" AS log
          USING expired_logs
          WHERE log."id" = expired_logs."id"
          RETURNING 1
        )
        SELECT COUNT(*)::int AS deleted_count
        FROM deleted_logs
      `,
      [expirationThreshold, this.retentionConfig.batchSize],
    );

    return this.readDeletedCount(result);
  }

  private async acquireAdvisoryLock(
    queryRunner: QueryRunner,
  ): Promise<boolean> {
    const result: unknown = await queryRunner.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [LOG_RETENTION_ADVISORY_LOCK_ID],
    );

    if (!Array.isArray(result)) {
      return false;
    }

    return (result[0] as AdvisoryLockRow | undefined)?.acquired === true;
  }

  private async releaseAdvisoryLock(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.query('SELECT pg_advisory_unlock($1)', [
        LOG_RETENTION_ADVISORY_LOCK_ID,
      ]);
    } catch (error: unknown) {
      this.logger.error(
        'Failed to release the log-retention advisory lock',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private readDeletedCount(result: unknown): number {
    if (!Array.isArray(result)) {
      return 0;
    }

    const deletedCount = (result[0] as DeletedCountRow | undefined)
      ?.deleted_count;

    return typeof deletedCount === 'number' ? deletedCount : 0;
  }
}
