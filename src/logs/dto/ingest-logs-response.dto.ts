import { ApiProperty } from '@nestjs/swagger';

import { RejectedLogDto } from './rejected-log.dto';

/** Result of processing an ingestion batch. */
export class IngestLogsResponseDto {
  @ApiProperty({ example: 9 })
  readonly accepted!: number;

  @ApiProperty({ type: [RejectedLogDto] })
  readonly rejected!: readonly RejectedLogDto[];
}
