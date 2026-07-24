import { Injectable } from '@nestjs/common';

import { LogEntryValidationResult } from './models/log-entry-validation-result';
import { formatLogEntryValidationError } from './validation/format-log-entry-validation-error';
import { LOG_ENTRY_SCHEMA } from './validation/log-entry.schema';
import { LogTimestampValidator } from './validation/log-timestamp.validator';

/** Validates one untrusted log entry without affecting the rest of its batch. */
@Injectable()
export class LogEntryValidator {
  constructor(private readonly logTimestampValidator: LogTimestampValidator) {}

  validate(rawLogEntry: unknown): LogEntryValidationResult {
    const parsedLogEntry = LOG_ENTRY_SCHEMA.safeParse(rawLogEntry);

    if (!parsedLogEntry.success) {
      return {
        isValid: false,
        reason: formatLogEntryValidationError({
          rawLogEntry,
          validationIssue: parsedLogEntry.error.issues[0],
        }),
      };
    }

    const logTimestamp = new Date(parsedLogEntry.data.timestamp);
    if (this.logTimestampValidator.isTooFarInFuture(logTimestamp)) {
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
