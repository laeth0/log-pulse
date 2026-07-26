/** PostgreSQL aggregate result before repository normalization. */
export type RawLogAggregateRow = Readonly<{
  start: Date | string;
  group: string | null;
  count: string;
}>;
