import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { performance } from 'node:perf_hooks';
import type { QueryRunner } from 'typeorm';

import {
  LOG_RETENTION_CRON_EXPRESSION,
  LOG_RETENTION_JOB_NAME,
} from '../../common/const/log-retention.const';
import { Clock } from '../../common/time/clock';
import { LogRetentionConfig } from './log-retention.config';
import { LogRetentionRepository } from './log-retention.repository';

export type RetentionRunResult = Readonly<{
  status: 'disabled' | 'skipped' | 'completed';
  deleted: number;
  batches: number;
  durationMs: number;
  rowsPerSecond: number;
  backlogRemaining: boolean;
  cutoff: string | null;
}>;

@Injectable()
export class LogRetentionScheduler {
  private readonly logger = new Logger(LogRetentionScheduler.name);

  constructor(
    private readonly repository: LogRetentionRepository,
    private readonly config: LogRetentionConfig,
    private readonly clock: Clock,
  ) {}

  @Cron(LOG_RETENTION_CRON_EXPRESSION, {
    name: LOG_RETENTION_JOB_NAME,
    waitForCompletion: true,
  })
  async scheduledRun(): Promise<void> {
    try {
      const result = await this.runNow();
      this.logger.log(
        JSON.stringify({ event: 'retention.completed', ...result }),
      );
    } catch (error: unknown) {
      this.logger.error(
        `Retention execution failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async runNow(): Promise<RetentionRunResult> {
    if (!this.config.enabled) {
      return this.createNoWorkResult('disabled');
    }

    const queryRunner = this.repository.createQueryRunner();
    const startedAt = performance.now();
    let lockAcquired = false;

    try {
      await queryRunner.connect();
      lockAcquired = await this.repository.acquireLock(queryRunner);
      if (!lockAcquired) {
        return this.createNoWorkResult('skipped');
      }

      const cutoff = this.createCutoff(this.clock.now());
      const deletion = await this.deleteWithinBudget(
        queryRunner,
        cutoff,
        startedAt,
      );
      const backlogRemaining = await this.repository.hasBacklog(
        queryRunner,
        cutoff,
      );
      const durationMs = performance.now() - startedAt;

      return {
        status: 'completed',
        deleted: deletion.deleted,
        batches: deletion.batches,
        durationMs: this.round(durationMs),
        rowsPerSecond:
          durationMs === 0
            ? deletion.deleted
            : this.round((deletion.deleted * 1_000) / durationMs),
        backlogRemaining,
        cutoff: cutoff.toISOString(),
      };
    } finally {
      await this.releaseResources(queryRunner, lockAcquired);
    }
  }

  private async deleteWithinBudget(
    queryRunner: QueryRunner,
    cutoff: Date,
    startedAt: number,
  ): Promise<Readonly<{ deleted: number; batches: number }>> {
    let deleted = 0;
    let batches = 0;

    while (
      batches < this.config.maxBatchesPerRun &&
      performance.now() - startedAt < this.config.maxRunTimeMs
    ) {
      const batchDeleted = await this.repository.deleteBatch(
        queryRunner,
        cutoff,
        this.config.batchSize,
      );
      deleted += batchDeleted;
      batches += 1;

      if (batchDeleted < this.config.batchSize) {
        break;
      }

      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    return { deleted, batches };
  }

  private createCutoff(referenceTime: Date): Date {
    return new Date(
      referenceTime.getTime() -
        this.config.retentionDays * 24 * 60 * 60 * 1_000,
    );
  }

  private async releaseResources(
    queryRunner: QueryRunner,
    lockAcquired: boolean,
  ): Promise<void> {
    if (lockAcquired && !queryRunner.isReleased) {
      try {
        await this.repository.releaseLock(queryRunner);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to release retention ownership: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    if (!queryRunner.isReleased) {
      if (queryRunner.isTransactionActive) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (error: unknown) {
          this.logger.error(
            `Failed to roll back retention transaction: ${
              error instanceof Error ? error.message : 'unknown error'
            }`,
          );
        }
      }

      try {
        await queryRunner.release();
      } catch (error: unknown) {
        this.logger.error(
          `Failed to release retention connection: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
  }

  private createNoWorkResult(
    status: 'disabled' | 'skipped',
  ): RetentionRunResult {
    return {
      status,
      deleted: 0,
      batches: 0,
      durationMs: 0,
      rowsPerSecond: 0,
      backlogRemaining: false,
      cutoff: null,
    };
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
