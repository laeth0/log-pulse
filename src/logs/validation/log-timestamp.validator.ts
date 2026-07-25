import { Injectable } from '@nestjs/common';

import { MAX_LOG_FUTURE_OFFSET_MILLISECONDS } from '../../common/const/log-ingestion.const';

/** Enforces time-related ingestion rules after timestamp parsing. */
@Injectable()
export class LogTimestampValidator {
  createLatestAcceptedTimestamp(referenceTimestamp: Date): Date {
    return new Date(
      referenceTimestamp.getTime() + MAX_LOG_FUTURE_OFFSET_MILLISECONDS,
    );
  }

  isTooFarInFuture(logTimestamp: Date, latestAcceptedTimestamp: Date): boolean {
    return logTimestamp.getTime() > latestAcceptedTimestamp.getTime();
  }
}
