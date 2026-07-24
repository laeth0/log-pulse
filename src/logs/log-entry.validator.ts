import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { LogEntryValidationResult } from './models/log-entry-validation-result';
import { ValidatedIngestLogs } from './models/validated-ingest-logs';
import { formatLogEntryValidationError } from './validation/format-log-entry-validation-error';
import { LOG_ENTRY_SCHEMA } from './validation/log-entry.schema';
import { LogTimestampValidator } from './validation/log-timestamp.validator';

/**
 * Request pipe that validates each log independently and transforms accepted
 * entries into persistence-ready values before the controller is invoked.
 */
@Injectable()
export class LogEntryValidator implements PipeTransform<
  unknown,
  ValidatedIngestLogs
> {
  constructor(private readonly logTimestampValidator: LogTimestampValidator) {}

  transform(ingestionRequest: unknown): ValidatedIngestLogs {
    if (
      typeof ingestionRequest !== 'object' ||
      ingestionRequest === null ||
      !Array.isArray(Reflect.get(ingestionRequest, 'logs'))
    ) {
      throw new BadRequestException({ error: 'logs must be an array' });
    }

    const rawLogEntries: readonly unknown[] = Reflect.get(
      ingestionRequest,
      'logs',
    );
    const validatedLogs: ValidatedIngestLogs['logs'][number][] = [];
    const rejectedLogs: ValidatedIngestLogs['rejected'][number][] = [];

    rawLogEntries.forEach((rawLogEntry: unknown, entryIndex: number): void => {
      const validationResult = this.validateEntry(rawLogEntry);

      if (validationResult.isValid) {
        validatedLogs.push(validationResult.log);
        return;
      }

      rejectedLogs.push({
        index: entryIndex,
        reason: validationResult.reason,
      });
    });

    const validatedRequest: ValidatedIngestLogs = {
      logs: validatedLogs,
      rejected: rejectedLogs,
    };

    if (validatedLogs.length === 0) {
      throw new BadRequestException({
        accepted: 0,
        rejected: rejectedLogs,
      });
    }

    return validatedRequest;
  }

  private validateEntry(rawLogEntry: unknown): LogEntryValidationResult {
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
