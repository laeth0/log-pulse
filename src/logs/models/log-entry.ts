import type { LogAttributes } from '../entities/log.entity';
import type { LogLevel } from '../../common/enums/log-level.enum';

/** Validated log data ready for persistence. */
export type LogEntry = Readonly<{
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  attributes: LogAttributes;
}>;
