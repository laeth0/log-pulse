import {
  LOG_AGGREGATE_BUCKETS,
  LOG_AGGREGATE_GROUPS,
} from '../../common/const/log-aggregate.const';
import { LogFilters } from './log-filters';

export type LogAggregateBucket = (typeof LOG_AGGREGATE_BUCKETS)[number];
export type LogAggregateGroup = (typeof LOG_AGGREGATE_GROUPS)[number];

export type LogAggregateQuery = Readonly<
  Omit<LogFilters, 'since' | 'until'> & {
    since: Date;
    until: Date;
    bucket: LogAggregateBucket;
    groupBy?: LogAggregateGroup;
  }
>;
