import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import { MAX_LOG_FUTURE_OFFSET_MILLISECONDS } from '../../common/const/log-ingestion.const';
import { LogLevel } from '../../common/enums/log-level.enum';
import type { LogEntry } from '../models/log-entry';
import type { RejectedLog } from '../models/rejected-log';
import type { ValidatedIngestLogs } from '../models/validated-ingest-logs';

const LOG_ENTRY_SCHEMA = z.object({
  timestamp: z.iso
    .datetime({ offset: true })
    .transform((timestamp) => new Date(timestamp)),
  level: z.enum(LogLevel),
  service: z.string().min(1),
  message: z.string().min(1),
  attributes: z
    .record(z.string(), z.union([z.string(), z.number().finite(), z.boolean()]))
    .default({}),
});

const LOG_BATCH_SCHEMA = z.object({
  logs: z.array(z.unknown()),
});

/** Validates a batch while preserving valid entries when other entries fail. */
export function parseIngestLogs(
  request: unknown,
  currentTime: Date,
): ValidatedIngestLogs {
  const batch = LOG_BATCH_SCHEMA.safeParse(request);

  if (!batch.success) {
    throw new BadRequestException({ error: 'logs must be an array' });
  }

  const latestTimestamp =
    currentTime.getTime() + MAX_LOG_FUTURE_OFFSET_MILLISECONDS;
  const logs: LogEntry[] = [];
  const rejected: RejectedLog[] = [];

  for (const [index, rawLog] of batch.data.logs.entries()) {
    const parsedLog = LOG_ENTRY_SCHEMA.safeParse(rawLog);

    if (!parsedLog.success) {
      rejected.push({
        index,
        reason: getLogValidationError(rawLog, parsedLog.error.issues[0]),
      });
      continue;
    }

    if (parsedLog.data.timestamp.getTime() > latestTimestamp) {
      rejected.push({
        index,
        reason: 'timestamp is more than 5 minutes in the future',
      });
      continue;
    }

    logs.push(parsedLog.data);
  }

  if (logs.length === 0) {
    throw new BadRequestException({ accepted: 0, rejected });
  }

  return { logs, rejected };
}

function getLogValidationError(
  rawLog: unknown,
  issue: z.core.$ZodIssue | undefined,
): string {
  const field = String(issue?.path[0] ?? '');

  switch (field) {
    case 'level':
      return `invalid level: '${String(readField(rawLog, field))}'`;
    case 'timestamp':
      return 'invalid timestamp';
    case 'attributes':
      return 'attributes must be a flat object with primitive values';
    case 'service':
    case 'message':
      return `${field} must be a non-empty string`;
    default:
      return 'invalid log entry';
  }
}

function readField(value: unknown, field: string): unknown {
  return typeof value === 'object' && value !== null
    ? Reflect.get(value, field)
    : undefined;
}
