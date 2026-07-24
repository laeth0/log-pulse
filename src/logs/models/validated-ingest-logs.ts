import { RejectedLogDto } from '../dto/rejected-log.dto';
import { LogEntry } from './log-entry';

/** A batch transformed and validated at the HTTP request boundary. */
export type ValidatedIngestLogs = Readonly<{
  logs: readonly LogEntry[];
  rejected: readonly RejectedLogDto[];
}>;
