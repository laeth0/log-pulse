import { ApiProperty } from '@nestjs/swagger';

import type { RejectedLog } from '../../models/rejected-log';

/** Describes an entry rejected from an ingestion batch. */
export class RejectedLogDto implements RejectedLog {
  @ApiProperty({ example: 3 })
  readonly index!: number;

  @ApiProperty({ example: "invalid level: 'critical'" })
  readonly reason!: string;
}
