import { BadRequestException, Injectable } from '@nestjs/common';

import {
  LOG_AGGREGATE_BUCKET_SCHEMA,
  LOG_AGGREGATE_GROUP_SCHEMA,
} from '../../common/const/log-aggregate.const';
import {
  LogAggregateBucket,
  LogAggregateGroup,
  LogAggregateQuery,
} from '../models/log-aggregate-query';
import { LogFilterParser } from './log-filter.parser';

/** Validates aggregation-specific parameters and shared log filters. */
@Injectable()
export class LogAggregateQueryParser {
  constructor(private readonly logFilterParser: LogFilterParser) {}

  parse(
    rawQueryParameters: Readonly<Record<string, unknown>>,
  ): LogAggregateQuery {
    const logFilters = this.logFilterParser.parse(rawQueryParameters);
    const rangeStart = logFilters.since;
    const rangeEnd = logFilters.until;

    if (!rangeStart) {
      this.reject('since is required');
    }

    if (!rangeEnd) {
      this.reject('until is required');
    }

    const bucketSize = this.parseBucket(rawQueryParameters.bucket);
    const groupingDimension = this.parseGroupBy(rawQueryParameters.group_by);

    return {
      ...logFilters,
      since: rangeStart,
      until: rangeEnd,
      bucket: bucketSize,
      ...(groupingDimension !== undefined && {
        groupBy: groupingDimension,
      }),
    };
  }

  private parseBucket(rawBucket: unknown): LogAggregateBucket {
    const parsedBucket = LOG_AGGREGATE_BUCKET_SCHEMA.safeParse(rawBucket);

    if (!parsedBucket.success) {
      this.reject('bucket must be one of: 1m, 5m, 1h, 1d');
    }

    return parsedBucket.data;
  }

  private parseGroupBy(
    rawGroupingDimension: unknown,
  ): LogAggregateGroup | undefined {
    if (rawGroupingDimension === undefined) {
      return undefined;
    }

    const parsedGroupingDimension =
      LOG_AGGREGATE_GROUP_SCHEMA.safeParse(rawGroupingDimension);
    if (!parsedGroupingDimension.success) {
      this.reject('group_by must be one of: service, level');
    }

    return parsedGroupingDimension.data;
  }

  private reject(message: string): never {
    throw new BadRequestException({ error: message });
  }
}
