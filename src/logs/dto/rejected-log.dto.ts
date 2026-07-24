import { ApiProperty } from '@nestjs/swagger';

/** Describes an entry rejected from an ingestion batch. */
export class RejectedLogDto {
  @ApiProperty({ example: 3 })
  readonly index!: number;

  @ApiProperty({ example: "invalid level: 'critical'" })
  readonly reason!: string;
}
