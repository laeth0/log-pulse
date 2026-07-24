import { z } from 'zod';

type FormatValidationErrorParams = Readonly<{
  rawLogEntry: unknown;
  validationIssue: z.core.$ZodIssue;
}>;

/** Converts schema errors into reasons defined by the ingestion API. */
export function formatLogEntryValidationError({
  rawLogEntry,
  validationIssue,
}: FormatValidationErrorParams): string {
  const invalidFieldName = String(validationIssue.path[0] ?? 'entry');

  if (invalidFieldName === 'level') {
    return `invalid level: '${String(
      readLogEntryField(rawLogEntry, invalidFieldName),
    )}'`;
  }

  if (invalidFieldName === 'timestamp') {
    return 'invalid timestamp';
  }

  if (invalidFieldName === 'attributes') {
    return 'attributes must be a flat object with primitive values';
  }

  return `${invalidFieldName} must be a non-empty string`;
}

function readLogEntryField(rawLogEntry: unknown, fieldName: string): unknown {
  if (typeof rawLogEntry !== 'object' || rawLogEntry === null) {
    return undefined;
  }

  return Reflect.get(rawLogEntry, fieldName);
}
