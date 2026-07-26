import { z } from 'zod';

import {
  LOG_AGGREGATE_BUCKETS,
  LOG_AGGREGATE_GROUPS,
} from '../../common/const/log-aggregate.const';
import {
  DEFAULT_LOG_QUERY_LIMIT,
  MAX_LOG_QUERY_LIMIT,
} from '../../common/const/log-query.const';
import { LogLevel } from '../../common/enums/log-level.enum';
import { LogAggregateQuery } from '../models/log-aggregate-query';
import { LogQuery } from '../models/log-query';
import { LogQueryCursorCodec } from './log-query-cursor.codec';

const LOG_QUERY_PARAMETERS = new Set([
  'service',
  'level',
  'since',
  'until',
  'q',
  'limit',
  'cursor',
]);

const AGGREGATE_QUERY_PARAMETERS = new Set([
  'service',
  'level',
  'since',
  'until',
  'q',
  'bucket',
  'group_by',
]);

export const createLogQuerySchema = (
  logQueryCursorCodec: LogQueryCursorCodec,
) =>
  z
    .object({
      service: z.string().optional(),
      level: z.enum(LogLevel).optional(),
      since: z.iso
        .datetime({ offset: true })
        .transform((value) => new Date(value))
        .optional(),
      until: z.iso
        .datetime({ offset: true })
        .transform((value) => new Date(value))
        .optional(),
      q: z.string().min(1, 'q must not be empty').optional(),
      limit: z
        .string()
        .regex(/^\d+$/, 'limit must be numeric')
        .transform(Number)
        .refine((limit) => limit > 0, 'limit must be greater than zero')
        .transform((limit) => Math.min(limit, MAX_LOG_QUERY_LIMIT))
        .default(DEFAULT_LOG_QUERY_LIMIT),
      cursor: z
        .string()
        .transform((value, context) => {
          const cursor = logQueryCursorCodec.decode(value);

          if (cursor === null) {
            context.addIssue({ code: 'custom', message: 'invalid cursor' });
            return z.NEVER;
          }

          return cursor;
        })
        .optional(),
    })
    .catchall(z.unknown())
    .superRefine((query, context) => {
      for (const [name, value] of Object.entries(query)) {
        if (LOG_QUERY_PARAMETERS.has(name)) {
          continue;
        }

        if (!name.startsWith('attr.')) {
          context.addIssue({
            code: 'custom',
            message: `unknown query parameter: '${name}'`,
          });
          continue;
        }

        if (name === 'attr.' || typeof value !== 'string') {
          context.addIssue({
            code: 'custom',
            message: `invalid attribute filter: '${name}'`,
          });
        }
      }

      if (query.since && query.until && query.until < query.since) {
        context.addIssue({
          code: 'custom',
          message: 'until must not be before since',
        });
      }
    })
    .transform((query): LogQuery => ({
      service: query.service,
      level: query.level,
      since: query.since,
      until: query.until,
      messageQuery: query.q,
      limit: query.limit,
      cursor: query.cursor,
      attributes: Object.entries(query)
        .filter(
          (entry): entry is [string, string] =>
            entry[0].startsWith('attr.') && typeof entry[1] === 'string',
        )
        .map(([name, value]) => [name.slice('attr.'.length), value]),
    }));

export const LOG_AGGREGATE_QUERY_SCHEMA = z
  .object({
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
    bucket: z.enum(LOG_AGGREGATE_BUCKETS, {
      error: 'bucket must be one of: 1m, 5m, 1h, 1d',
    }),
    group_by: z
      .enum(LOG_AGGREGATE_GROUPS, {
        error: 'group_by must be one of: service, level',
      })
      .optional(),
  })
  .catchall(z.unknown())
  .superRefine((query, context) => {
    for (const [name, value] of Object.entries(query)) {
      if (AGGREGATE_QUERY_PARAMETERS.has(name)) {
        continue;
      }

      if (!name.startsWith('attr.')) {
        context.addIssue({
          code: 'custom',
          message: `unknown query parameter: '${name}'`,
        });
        continue;
      }

      if (name === 'attr.' || typeof value !== 'string') {
        context.addIssue({
          code: 'custom',
          message: `invalid attribute filter: '${name}'`,
        });
      }
    }

    if (query.until < query.since) {
      context.addIssue({
        code: 'custom',
        message: 'until must not be before since',
      });
    }
  })
  .transform((query): LogAggregateQuery => ({
    service: query.service,
    level: query.level,
    since: query.since,
    until: query.until,
    messageQuery: query.q,
    bucket: query.bucket,
    ...(query.group_by && { groupBy: query.group_by }),
    attributes: Object.entries(query)
      .filter(
        (entry): entry is [string, string] =>
          entry[0].startsWith('attr.') && typeof entry[1] === 'string',
      )
      .map(([name, value]) => [name.slice('attr.'.length), value]),
  }));
