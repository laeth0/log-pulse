/** Normalized aggregate result returned by the logs repository. */
export type LogAggregateRow = Readonly<{
  start: Date;
  group: string | null;
  count: number;
}>;
