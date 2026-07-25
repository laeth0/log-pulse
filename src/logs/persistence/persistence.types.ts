export type StoredLogAggregate = Readonly<{
  start: Date;
  group: string | null;
  count: number;
}>;
