/** An invalid entry rejected from a log ingestion batch. */
export type RejectedLog = Readonly<{
  index: number;
  reason: string;
}>;
