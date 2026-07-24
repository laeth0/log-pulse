import { LogAttributes, LogLevel } from '../entities/log.entity';

/** Validated log data ready for persistence. */
export type LogEntry = Readonly<{
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  attributes: LogAttributes;
}>;
