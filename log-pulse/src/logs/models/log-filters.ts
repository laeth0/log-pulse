import { LogLevel } from '../entities/log.entity';

/** Filters shared by log listing and aggregation queries. */
export type LogFilters = Readonly<{
  service?: string;
  level?: LogLevel;
  since?: Date;
  until?: Date;
  attributes: Readonly<Record<string, string>>;
  messageQuery?: string;
}>;
