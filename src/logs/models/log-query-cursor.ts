/** Stable position in the descending log timeline. */
export type LogQueryCursor = Readonly<{
  v: 1;
  timestamp: Date;
  id: string;
  filterFingerprint: string;
}>;
