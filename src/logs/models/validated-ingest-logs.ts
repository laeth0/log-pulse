import type { LogEntry } from './log-entry';
import type { RejectedLog } from './rejected-log';

/** A validated batch ready for persistence. */
export type ValidatedIngestLogs = Readonly<{
  logs: readonly LogEntry[];
  rejected: readonly RejectedLog[];
}>;
