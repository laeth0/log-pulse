import { LogFilters } from './log-filters';
import { LogQueryCursor } from './log-query-cursor';

export type LogQuery = Readonly<
  LogFilters & {
    limit: number;
    cursor?: LogQueryCursor;
  }
>;
