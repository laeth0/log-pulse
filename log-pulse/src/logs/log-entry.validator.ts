import { Injectable } from '@nestjs/common';

import { LogEntryValidationResult } from './models/log-entry-validation-result';
import { formatLogEntryValidationError } from './validation/format-log-entry-validation-error';
import { LOG_ENTRY_SCHEMA } from './validation/log-entry.schema';
import { LogTimestampValidator } from './validation/log-timestamp.validator';

/** Validates one untrusted log entry without affecting the rest of its batch. */
@Injectable()
export class LogEntryValidator {
  constructor(private readonly timestampValidator: LogTimestampValidator) {}

  validate(input: unknown): LogEntryValidationResult {
    const parsedEntry = LOG_ENTRY_SCHEMA.safeParse(input);

    if (!parsedEntry.success) {
      return {
        isValid: false,
        reason: formatLogEntryValidationError({
          input,
          issue: parsedEntry.error.issues[0],
        }),
      };
    }

    const timestamp = new Date(parsedEntry.data.timestamp);
    if (this.timestampValidator.isTooFarInFuture(timestamp)) {
      return {
        isValid: false,
        reason: 'timestamp is more than 5 minutes in the future',
      };
    }

    return {
      isValid: true,
      log: {
        ...parsedEntry.data,
        timestamp,
        attributes: parsedEntry.data.attributes ?? {},
      },
    };
  }
}
