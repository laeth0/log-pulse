import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DEFAULT_LOG_RETENTION_BATCH_SIZE,
  DEFAULT_LOG_RETENTION_DAYS,
  DEFAULT_LOG_RETENTION_MAX_BATCHES,
  MAX_LOG_RETENTION_BATCH_SIZE,
  MAX_LOG_RETENTION_DAYS,
  MAX_LOG_RETENTION_MAX_BATCHES,
} from '../../common/const/log-retention.const';

/** Validated runtime settings for the log-retention job. */
@Injectable()
export class LogRetentionConfig {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly batchSize: number;
  readonly maxBatchesPerRun: number;

  constructor(configService: ConfigService) {
    this.enabled = this.readBoolean(
      configService,
      'LOG_RETENTION_ENABLED',
      true,
    );
    this.retentionDays = this.readPositiveInteger(
      configService,
      'LOG_RETENTION_DAYS',
      DEFAULT_LOG_RETENTION_DAYS,
      MAX_LOG_RETENTION_DAYS,
    );
    this.batchSize = this.readPositiveInteger(
      configService,
      'LOG_RETENTION_BATCH_SIZE',
      DEFAULT_LOG_RETENTION_BATCH_SIZE,
      MAX_LOG_RETENTION_BATCH_SIZE,
    );
    this.maxBatchesPerRun = this.readPositiveInteger(
      configService,
      'LOG_RETENTION_MAX_BATCHES',
      DEFAULT_LOG_RETENTION_MAX_BATCHES,
      MAX_LOG_RETENTION_MAX_BATCHES,
    );
  }

  private readBoolean(
    configService: ConfigService,
    environmentVariableName: string,
    defaultValue: boolean,
  ): boolean {
    const configuredValue = configService.get<string>(environmentVariableName);

    if (configuredValue === undefined) {
      return defaultValue;
    }

    if (configuredValue === 'true') {
      return true;
    }

    if (configuredValue === 'false') {
      return false;
    }

    throw new Error(`${environmentVariableName} must be true or false`);
  }

  private readPositiveInteger(
    configService: ConfigService,
    environmentVariableName: string,
    defaultValue: number,
    maximumValue: number,
  ): number {
    const configuredValue = configService.get<string>(environmentVariableName);

    if (configuredValue === undefined) {
      return defaultValue;
    }

    const parsedValue = Number(configuredValue);
    if (
      !Number.isSafeInteger(parsedValue) ||
      parsedValue < 1 ||
      parsedValue > maximumValue
    ) {
      throw new Error(
        `${environmentVariableName} must be an integer between 1 and ${maximumValue}`,
      );
    }

    return parsedValue;
  }
}
