import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

import {
  DEFAULT_LOG_QUERY_LIMIT,
  MAX_LOG_QUERY_LIMIT,
} from '../../common/const/log-query.const';
import { LogLevel } from '../../common/enums/log-level.enum';
import type { LogAggregateQuery } from '../models/log-aggregate-query';
import type { LogAttributeFilter } from '../models/log-filters';
import type { LogQuery } from '../models/log-query';
import { LogQueryCursorCodec } from '../query/log-query-cursor.codec';

const LOG_QUERY_PARAMETERS = new Set<string>([
  'service',
  'level',
  'since',
  'until',
  'q',
  'limit',
  'cursor',
]);

const AGGREGATE_QUERY_PARAMETERS = new Set<string>([
  'service',
  'level',
  'since',
  'until',
  'q',
  'bucket',
  'group_by',
]);

const LOG_QUERY_SCHEMA = z.object({
  service: z.string().optional(),
  level: z.enum(LogLevel).optional(),
  since: optionalTimestamp(),
  until: optionalTimestamp(),
  q: z.string().min(1, 'q must not be empty').optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be numeric')
    .transform(Number)
    .refine((limit) => limit > 0, 'limit must be greater than zero')
    .transform((limit) => Math.min(limit, MAX_LOG_QUERY_LIMIT))
    .default(DEFAULT_LOG_QUERY_LIMIT),
  cursor: z.string().optional(),
});

const LOG_AGGREGATE_QUERY_SCHEMA = z.object({
  service: z.string().optional(),
  level: z.enum(LogLevel).optional(),
  since: z
    .string({ error: 'since is required' })
    .datetime({ offset: true, error: 'invalid since timestamp' })
    .transform((value) => new Date(value)),
  until: z
    .string({ error: 'until is required' })
    .datetime({ offset: true, error: 'invalid until timestamp' })
    .transform((value) => new Date(value)),
  q: z.string().min(1, 'q must not be empty').optional(),
  bucket: z.enum(['1m', '5m', '1h', '1d'], {
    error: 'bucket must be one of: 1m, 5m, 1h, 1d',
  }),
  group_by: z
    .enum(['service', 'level'], {
      error: 'group_by must be one of: service, level',
    })
    .optional(),
});

export function parseLogQuery(
  rawQuery: Readonly<Record<string, unknown>>,
  cursorCodec: LogQueryCursorCodec,
): LogQuery {
  const attributes = parseAttributes(rawQuery, LOG_QUERY_PARAMETERS);
  const query = parseSchema(LOG_QUERY_SCHEMA, rawQuery);
  const cursor = query.cursor ? cursorCodec.decode(query.cursor) : undefined;

  if (query.cursor && !cursor) {
    invalidQuery('invalid cursor');
  }

  validateTimeRange(query.since, query.until);

  return {
    service: query.service,
    level: query.level,
    since: query.since,
    until: query.until,
    messageQuery: query.q,
    limit: query.limit,
    cursor: cursor ?? undefined,
    attributes,
  };
}

export function parseLogAggregateQuery(
  rawQuery: Readonly<Record<string, unknown>>,
): LogAggregateQuery {
  const attributes = parseAttributes(rawQuery, AGGREGATE_QUERY_PARAMETERS);
  const query = parseSchema(LOG_AGGREGATE_QUERY_SCHEMA, rawQuery);

  validateTimeRange(query.since, query.until);

  return {
    service: query.service,
    level: query.level,
    since: query.since,
    until: query.until,
    messageQuery: query.q,
    bucket: query.bucket,
    ...(query.group_by && { groupBy: query.group_by }),
    attributes,
  };
}

function optionalTimestamp() {
  return z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .optional();
}

function parseAttributes(
  query: Readonly<Record<string, unknown>>,
  knownParameters: ReadonlySet<string>,
): readonly LogAttributeFilter[] {
  const attributes: LogAttributeFilter[] = [];

  for (const [name, value] of Object.entries(query)) {
    if (knownParameters.has(name)) {
      continue;
    }

    if (!name.startsWith('attr.')) {
      invalidQuery(`unknown query parameter: '${name}'`);
    }

    const attributeName = name.slice('attr.'.length);
    const parsedValue = z.string().safeParse(value);

    if (attributeName.length === 0 || !parsedValue.success) {
      invalidQuery(`invalid attribute filter: '${name}'`);
    }

    attributes.push([attributeName, parsedValue.data]);
  }

  return attributes;
}

function validateTimeRange(since?: Date, until?: Date): void {
  if (since && until && until < since) {
    invalidQuery('until must not be before since');
  }
}

function parseSchema<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    invalidQuery(result.error.issues[0]?.message ?? 'invalid query parameters');
  }

  return result.data;
}

function invalidQuery(message: string): never {
  throw new BadRequestException({ error: message });
}
