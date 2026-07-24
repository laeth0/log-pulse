import { LogLevel } from '../entities/log.entity';
import { LogQueryCursor } from './log-query-cursor';

export type LogQuery = Readonly<{
  service?: string;
  level?: LogLevel;
  since?: Date;
  until?: Date;
  attributes: Readonly<Record<string, string>>;
  messageQuery?: string;
  limit: number;
  cursor?: LogQueryCursor;
}>;
