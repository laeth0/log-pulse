import { ApiProperty } from '@nestjs/swagger';

import { LogAggregateBucketDto } from './log-aggregate-bucket.dto';

/** Time-bucketed log count response. */
export class LogAggregateResponseDto {
  @ApiProperty({ type: [LogAggregateBucketDto] })
  readonly buckets!: readonly LogAggregateBucketDto[];
}
