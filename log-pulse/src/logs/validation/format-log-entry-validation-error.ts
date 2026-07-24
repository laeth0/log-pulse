import { z } from 'zod';

type FormatValidationErrorParams = Readonly<{
  input: unknown;
  issue: z.core.$ZodIssue;
}>;

/** Converts schema errors into reasons defined by the ingestion API. */
export function formatLogEntryValidationError({
  input,
  issue,
}: FormatValidationErrorParams): string {
  const fieldName = String(issue.path[0] ?? 'entry');

  if (fieldName === 'level') {
    return `invalid level: '${String(readField(input, fieldName))}'`;
  }

  if (fieldName === 'timestamp') {
    return 'invalid timestamp';
  }

  if (fieldName === 'attributes') {
    return 'attributes must be a flat object with primitive values';
  }

  return `${fieldName} must be a non-empty string`;
}

function readField(input: unknown, fieldName: string): unknown {
  if (typeof input !== 'object' || input === null) {
    return undefined;
  }

  return Reflect.get(input, fieldName);
}
