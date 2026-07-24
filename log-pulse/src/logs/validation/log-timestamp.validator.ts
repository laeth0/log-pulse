import { Injectable } from '@nestjs/common';

import { Clock } from '../../common/time/clock';

const MAX_FUTURE_OFFSET_MILLISECONDS = 5 * 60 * 1_000;

/** Enforces time-related ingestion rules after timestamp parsing. */
@Injectable()
export class LogTimestampValidator {
  constructor(private readonly clock: Clock) {}

  isTooFarInFuture(timestamp: Date): boolean {
    const latestAcceptedTimestamp =
      this.clock.now().getTime() + MAX_FUTURE_OFFSET_MILLISECONDS;

    return timestamp.getTime() > latestAcceptedTimestamp;
  }
}
