import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { performance } from 'node:perf_hooks';

import { Clock } from '../common/time/clock';
import { parseLogRetentionConfiguration } from './config/log-retention.config';
import { LogsRepository } from './logs.repository';

const retentionConfiguration = parseLogRetentionConfiguration(process.env);

@Injectable()
export class LogRetentionJob {
  constructor(
    private readonly logsRepository: LogsRepository,
    private readonly clock: Clock,
  ) {}

  @Cron(retentionConfiguration.cron, {
    name: 'log-retention',
    waitForCompletion: true,
  })
  async deleteExpiredLogs(): Promise<void> {
    const startedAt = performance.now();
    const expirationThreshold = new Date(
      this.clock.now().getTime() -
        retentionConfiguration.retentionDays * 24 * 60 * 60 * 1_000,
    );
    let completedBatches = 0;

    while (
      completedBatches < retentionConfiguration.maxBatches &&
      performance.now() - startedAt < retentionConfiguration.maxRunMilliseconds
    ) {
      const deletedInBatch = await this.logsRepository.deleteExpiredBatch(
        expirationThreshold,
        retentionConfiguration.batchSize,
      );

      completedBatches += 1;

      if (deletedInBatch < retentionConfiguration.batchSize) {
        break;
      }

      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  }
}
