import type { LogLevel } from '../../common/enums/log-level.enum';

export type LogAttributeFilter = readonly [name: string, value: string];

/** Filters shared by log listing and aggregation queries. */
export type LogFilters = Readonly<{
  service?: string;
  level?: LogLevel;
  since?: Date;
  until?: Date;
  attributes: readonly LogAttributeFilter[];
  messageQuery?: string;
}>;
