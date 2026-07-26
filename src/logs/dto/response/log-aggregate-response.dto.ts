import { ApiProperty } from '@nestjs/swagger';

import { LogAggregateBucketDto } from './log-aggregate-bucket.dto';

/** HTTP response containing time-bucketed log counts. */
export class LogAggregateResponseDto {
  @ApiProperty({ type: [LogAggregateBucketDto] })
  readonly buckets!: readonly LogAggregateBucketDto[];
}
