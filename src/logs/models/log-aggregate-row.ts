/** Raw PostgreSQL aggregation result before API mapping. */
export type LogAggregateRow = Readonly<{
  start: Date | string;
  group: string | null;
  count: string;
}>;
