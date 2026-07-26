export const LOG_AGGREGATE_BUCKETS = ['1m', '5m', '1h', '1d'] as const;
export const LOG_AGGREGATE_GROUPS = ['service', 'level'] as const;

export const LOG_AGGREGATE_INTERVALS = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '1h': '1 hour',
  '1d': '1 day',
} as const;
