import { LogFilters } from './log-filters';

export type LogAggregateBucket = '1m' | '5m' | '1h' | '1d';
export type LogAggregateGroup = 'service' | 'level';

export type LogAggregateQuery = Readonly<
  Omit<LogFilters, 'since' | 'until'> & {
    since: Date;
    until: Date;
    bucket: LogAggregateBucket;
    groupBy?: LogAggregateGroup;
  }
>;
