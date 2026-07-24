import { z } from 'zod';

export const LOG_AGGREGATE_BUCKETS = ['1m', '5m', '1h', '1d'] as const;
export const LOG_AGGREGATE_GROUPS = ['service', 'level'] as const;

export const LOG_AGGREGATE_BUCKET_SCHEMA = z.enum(LOG_AGGREGATE_BUCKETS);
export const LOG_AGGREGATE_GROUP_SCHEMA = z.enum(LOG_AGGREGATE_GROUPS);

export const LOG_AGGREGATE_INTERVALS = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '1h': '1 hour',
  '1d': '1 day',
} as const;

export const LOG_AGGREGATE_GROUP_EXPRESSIONS = {
  service: 'log.service',
  level: 'log.level',
} as const;

export const LOG_AGGREGATE_ORIGIN = '1970-01-01T00:00:00.000Z';
export const LOG_AGGREGATE_BUCKET_EXPRESSION =
  'date_bin(CAST(:bucketInterval AS interval), log.timestamp, CAST(:bucketOrigin AS timestamptz))';
