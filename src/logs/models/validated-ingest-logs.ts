import { RejectedLogDto } from '../dto/rejected-log.dto';
import { LogEntry } from './log-entry';

/** A validated batch ready for persistence. */
export type ValidatedIngestLogs = Readonly<{
  logs: readonly LogEntry[];
  rejected: readonly RejectedLogDto[];
}>;
