import { Injectable } from '@nestjs/common';

import { MAX_LOG_FUTURE_OFFSET_MILLISECONDS } from '../../common/const/log-ingestion.const';
import { Clock } from '../../common/time/clock';

/** Enforces time-related ingestion rules after timestamp parsing. */
@Injectable()
export class LogTimestampValidator {
  constructor(private readonly clock: Clock) {}

  isTooFarInFuture(logTimestamp: Date): boolean {
    const latestAcceptedTimestamp =
      this.clock.now().getTime() + MAX_LOG_FUTURE_OFFSET_MILLISECONDS;

    return logTimestamp.getTime() > latestAcceptedTimestamp;
  }
}
