import { LogEntry } from './log-entry';

export type LogEntryValidationResult =
  | Readonly<{ isValid: true; log: LogEntry }>
  | Readonly<{ isValid: false; reason: string }>;
