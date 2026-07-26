import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LOG_AGGREGATE_INTERVALS } from '../common/const/log-aggregate.const';
import { Log } from './entities/log.entity';
import type { LogAggregateQuery } from './models/log-aggregate-query';
import type { LogAggregateRow } from './models/log-aggregate-row';
import type { LogEntry } from './models/log-entry';
import type { LogQuery } from './models/log-query';
import type { RawLogAggregateRow } from './models/raw-log-aggregate-row';

@Injectable()
export class LogsRepository {
  private readonly insertChunkSize =
    Number(process.env.LOG_INGEST_CHUNK_SIZE) || 1_000;

  constructor(
    @InjectRepository(Log)
    private readonly repository: Repository<Log>,
  ) {}

  async insertBatch(logEntries: readonly LogEntry[]): Promise<void> {
    if (logEntries.length === 0) {
      return;
    }

    await this.repository.manager.transaction(async (entityManager) => {
      const transactionalRepository = entityManager.getRepository(Log);

      for (
        let chunkStart = 0;
        chunkStart < logEntries.length;
        chunkStart += this.insertChunkSize
      ) {
        await transactionalRepository.insert(
          logEntries.slice(chunkStart, chunkStart + this.insertChunkSize),
        );
      }
    });
  }

  async findPage(logQuery: LogQuery): Promise<Log[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('log')
      .select([
        'log.id',
        'log.timestamp',
        'log.level',
        'log.service',
        'log.message',
        'log.attributes',
      ]);

    if (logQuery.service !== undefined) {
      queryBuilder.andWhere('log.service = :service', {
        service: logQuery.service,
      });
    }

    if (logQuery.level !== undefined) {
      queryBuilder.andWhere('log.level = :level', {
        level: logQuery.level,
      });
    }

    if (logQuery.since !== undefined) {
      queryBuilder.andWhere('log.timestamp >= :since', {
        since: logQuery.since,
      });
    }

    if (logQuery.until !== undefined) {
      queryBuilder.andWhere('log.timestamp < :until', {
        until: logQuery.until,
      });
    }

    if (logQuery.messageQuery !== undefined) {
      const escapedMessage = logQuery.messageQuery.replace(/[\\%_]/g, '\\$&');
      queryBuilder.andWhere("log.message ILIKE :messageQuery ESCAPE '\\'", {
        messageQuery: `%${escapedMessage}%`,
      });
    }

    logQuery.attributes.forEach(
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

    if (logQuery.cursor !== undefined) {
      queryBuilder.andWhere(
        '(log.timestamp, log.id) < (:cursorTimestamp, :cursorId)',
        {
          cursorTimestamp: logQuery.cursor.timestamp,
          cursorId: logQuery.cursor.id,
        },
      );
    }

    return queryBuilder
      .orderBy('log.timestamp', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .take(logQuery.limit + 1)
      .getMany();
  }

  async aggregate(
    aggregateQuery: LogAggregateQuery,
  ): Promise<LogAggregateRow[]> {
    let groupByExpression: string | null = null;

    if (aggregateQuery.groupBy === 'service') {
      groupByExpression = 'log.service';
    } else if (aggregateQuery.groupBy === 'level') {
      groupByExpression = 'log.level';
    }

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

    const rows = await queryBuilder.getRawMany<RawLogAggregateRow>();

    return rows.map((row) => ({
      start: row.start instanceof Date ? row.start : new Date(row.start),
      group: row.group,
      count: Number(row.count),
    }));
  }
}
