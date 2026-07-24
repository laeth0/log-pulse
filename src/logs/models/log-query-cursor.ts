/** Stable position in the descending log timeline. */
export type LogQueryCursor = Readonly<{
  timestamp: Date;
  id: string;
}>;
