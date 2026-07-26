import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LOG_AGGREGATE_INTERVALS } from '../../common/const/log-aggregate.const';
import { Log } from '../entities/log.entity';
import type { LogAggregateQuery } from '../models/log-aggregate-query';
import type { LogAggregateRow } from '../models/log-aggregate-row';
import type { StoredLogAggregate } from './persistence.types';

@Injectable()
export class LogAggregationQuery {
  constructor(
    @InjectRepository(Log)
    private readonly repository: Repository<Log>,
  ) { }

  async execute(
    aggregateQuery: LogAggregateQuery,
  ): Promise<StoredLogAggregate[]> {
    const groupByExpression =
      aggregateQuery.groupBy === 'service'
        ? 'log.service'
        : aggregateQuery.groupBy === 'level'
          ? 'log.level'
          : null;

    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .select(
        'date_bin(CAST(:bucketInterval AS interval), log.timestamp, CAST(:bucketOrigin AS timestamptz))',
        'start',
      )
      .addSelect(groupByExpression ?? 'NULL::text', 'group')
      .addSelect('COUNT(*)::bigint', 'count')
      .setParameters({
        bucketInterval: LOG_AGGREGATE_INTERVALS[aggregateQuery.bucket],
        bucketOrigin: '1970-01-01T00:00:00.000Z',
      })
      .groupBy(
        'date_bin(CAST(:bucketInterval AS interval), log.timestamp, CAST(:bucketOrigin AS timestamptz))',
      )
      .orderBy(
        'date_bin(CAST(:bucketInterval AS interval), log.timestamp, CAST(:bucketOrigin AS timestamptz))',
        'ASC',
      );

    if (groupByExpression) {
      queryBuilder
        .addGroupBy(groupByExpression)
        .addOrderBy(groupByExpression, 'ASC');
    }

    if (aggregateQuery.service !== undefined) {
      queryBuilder.andWhere('log.service = :service', {
        service: aggregateQuery.service,
      });
    }

    if (aggregateQuery.level !== undefined) {
      queryBuilder.andWhere('log.level = :level', {
        level: aggregateQuery.level,
      });
    }

    queryBuilder
      .andWhere('log.timestamp >= :since', {
        since: aggregateQuery.since,
      })
      .andWhere('log.timestamp < :until', {
        until: aggregateQuery.until,
      });

    if (aggregateQuery.messageQuery !== undefined) {
      const escapedMessage = aggregateQuery.messageQuery.replace(
        /[\\%_]/g,
        '\\$&',
      );
      queryBuilder.andWhere("log.message ILIKE :messageQuery ESCAPE '\\'", {
        messageQuery: `%${escapedMessage}%`,
      });
    }

    aggregateQuery.attributes.forEach(
      ([attributeName, attributeValue], index): void => {
        queryBuilder.andWhere(
          `log.attributes ->> CAST(:attributeName${index} AS text) = CAST(:attributeValue${index} AS text)`,
          {
            [`attributeName${index}`]: attributeName,
            [`attributeValue${index}`]: attributeValue,
          },
        );
      },
    );

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
