import { Injectable } from '@nestjs/common';

import type { LogEntryValidationResult } from '../models/log-entry-validation-result';
import { formatLogEntryValidationError } from './format-log-entry-validation-error';
import { LOG_ENTRY_SCHEMA } from './log-entry.schema';
import { LogTimestampValidator } from './log-timestamp.validator';

@Injectable()
export class LogEntryValidator {
  constructor(private readonly timestampValidator: LogTimestampValidator) {}

  validate(
    rawLogEntry: unknown,
    latestAcceptedTimestamp: Date,
  ): LogEntryValidationResult {
    const parsedLogEntry = LOG_ENTRY_SCHEMA.safeParse(rawLogEntry);

    if (!parsedLogEntry.success) {
      const firstValidationIssue = parsedLogEntry.error.issues[0];
      return {
        isValid: false,
        reason:
          firstValidationIssue === undefined
            ? 'invalid log entry'
            : formatLogEntryValidationError({
                rawLogEntry,
                validationIssue: firstValidationIssue,
              }),
      };
    }

    const logTimestamp = new Date(parsedLogEntry.data.timestamp);
    if (
      this.timestampValidator.isTooFarInFuture(
        logTimestamp,
        latestAcceptedTimestamp,
      )
    ) {
      return {
        isValid: false,
        reason: 'timestamp is more than 5 minutes in the future',
      };
    }

    return {
      isValid: true,
      log: {
        ...parsedLogEntry.data,
        timestamp: logTimestamp,
        attributes: parsedLogEntry.data.attributes ?? {},
      },
    };
  }
}
