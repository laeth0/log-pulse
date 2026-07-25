import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { Clock } from '../../common/time/clock';
import type { ValidatedIngestLogs } from '../models/validated-ingest-logs';
import { LogEntryValidator } from './log-entry.validator';
import { LogTimestampValidator } from './log-timestamp.validator';

@Injectable()
export class LogBatchValidator implements PipeTransform<
  unknown,
  ValidatedIngestLogs
> {
  constructor(
    private readonly clock: Clock,
    private readonly entryValidator: LogEntryValidator,
    private readonly timestampValidator: LogTimestampValidator,
  ) {}

  transform(ingestionRequest: unknown): ValidatedIngestLogs {
    const rawLogEntries = this.readLogEntries(ingestionRequest);
    const latestAcceptedTimestamp =
      this.timestampValidator.createLatestAcceptedTimestamp(this.clock.now());
    const logs: ValidatedIngestLogs['logs'][number][] = [];
    const rejected: ValidatedIngestLogs['rejected'][number][] = [];

    rawLogEntries.forEach((rawLogEntry, index) => {
      const result = this.entryValidator.validate(
        rawLogEntry,
        latestAcceptedTimestamp,
      );
      if (result.isValid) {
        logs.push(result.log);
      } else {
        rejected.push({ index, reason: result.reason });
      }
    });

    if (logs.length === 0) {
      throw new BadRequestException({ accepted: 0, rejected });
    }

    return { logs, rejected };
  }

  private readLogEntries(ingestionRequest: unknown): readonly unknown[] {
    if (
      typeof ingestionRequest !== 'object' ||
      ingestionRequest === null ||
      !('logs' in ingestionRequest)
    ) {
      throw new BadRequestException({ error: 'logs must be an array' });
    }

    const { logs } = ingestionRequest;
    if (!Array.isArray(logs)) {
      throw new BadRequestException({ error: 'logs must be an array' });
    }

    return logs;
  }
}
