import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** Validated runtime settings for the log-retention job. */
@Injectable()
export class LogRetentionConfig {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly batchSize: number;
  readonly maxBatchesPerRun: number;
  readonly maxRunTimeMs: number;

  constructor(configService: ConfigService) {
    this.enabled = configService.getOrThrow<boolean>('retention.enabled');
    this.retentionDays = configService.getOrThrow<number>('retention.days');
    this.batchSize = configService.getOrThrow<number>('retention.batchSize');
    this.maxBatchesPerRun = configService.getOrThrow<number>(
      'retention.maxBatches',
    );
    this.maxRunTimeMs = configService.getOrThrow<number>('retention.maxRunMs');
  }
}
