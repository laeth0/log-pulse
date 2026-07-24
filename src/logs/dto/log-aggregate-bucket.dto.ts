import { ApiProperty } from '@nestjs/swagger';

/** Count for one time bucket and optional group. */
export class LogAggregateBucketDto {
  @ApiProperty({ example: '2026-07-20T14:00:00.000Z' })
  readonly start!: string;

  @ApiProperty({ example: 'checkout', nullable: true })
  readonly group!: string | null;

  @ApiProperty({ example: 118 })
  readonly count!: number;
}
