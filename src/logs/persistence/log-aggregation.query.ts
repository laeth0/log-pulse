import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  LOG_AGGREGATE_BUCKET_EXPRESSION,
  LOG_AGGREGATE_GROUP_EXPRESSIONS,
  LOG_AGGREGATE_INTERVALS,
  LOG_AGGREGATE_ORIGIN,
} from '../../common/const/log-aggregate.const';
import { Log } from '../entities/log.entity';
import type { LogAggregateQuery } from '../models/log-aggregate-query';
import type { LogAggregateRow } from '../models/log-aggregate-row';
import type { StoredLogAggregate } from './persistence.types';
import { LogFilterQueryBuilder } from './log-filter-query.builder';

@Injectable()
export class LogAggregationQuery {
  constructor(
    @InjectRepository(Log)
    private readonly repository: Repository<Log>,
    private readonly filterQueryBuilder: LogFilterQueryBuilder,
  ) {}

  async execute(
    aggregateQuery: LogAggregateQuery,
  ): Promise<StoredLogAggregate[]> {
    const groupByExpression = aggregateQuery.groupBy
      ? LOG_AGGREGATE_GROUP_EXPRESSIONS[aggregateQuery.groupBy]
      : null;
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .select(LOG_AGGREGATE_BUCKET_EXPRESSION, 'start')
      .addSelect(groupByExpression ?? 'NULL::text', 'group')
      .addSelect('COUNT(*)::bigint', 'count')
      .setParameters({
        bucketInterval: LOG_AGGREGATE_INTERVALS[aggregateQuery.bucket],
        bucketOrigin: LOG_AGGREGATE_ORIGIN,
      })
      .groupBy(LOG_AGGREGATE_BUCKET_EXPRESSION)
      .orderBy(LOG_AGGREGATE_BUCKET_EXPRESSION, 'ASC');

    if (groupByExpression) {
      queryBuilder
        .addGroupBy(groupByExpression)
        .addOrderBy(groupByExpression, 'ASC');
    }

    this.filterQueryBuilder.apply(queryBuilder, aggregateQuery);

    const rows = await queryBuilder.getRawMany<LogAggregateRow>();
    return rows.map((row) => this.decodeAggregateRow(row));
  }

  private decodeAggregateRow(row: LogAggregateRow): StoredLogAggregate {
    const start = row.start instanceof Date ? row.start : new Date(row.start);
    const count = Number(row.count);

    if (
      Number.isNaN(start.getTime()) ||
      !Number.isSafeInteger(count) ||
      count < 0 ||
      (row.group !== null && typeof row.group !== 'string')
    ) {
      throw new Error('PostgreSQL returned an invalid log aggregate row');
    }

    return {
      start,
      group: row.group,
      count,
    };
  }
}
