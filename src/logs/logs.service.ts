import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import {
  LOG_AGGREGATE_BUCKET_EXPRESSION,
  LOG_AGGREGATE_GROUP_EXPRESSIONS,
  LOG_AGGREGATE_INTERVALS,
  LOG_AGGREGATE_ORIGIN,
} from '../common/const/log-aggregate.const';
import { IngestLogsResponseDto } from './dto/ingest-logs-response.dto';
import { LogAggregateBucketDto } from './dto/log-aggregate-bucket.dto';
import { LogAggregateResponseDto } from './dto/log-aggregate-response.dto';
import { LogResponseDto } from './dto/log-response.dto';
import { QueryLogsResponseDto } from './dto/query-logs-response.dto';
import { Log } from './entities/log.entity';
import { LogAggregateQuery } from './models/log-aggregate-query';
import { LogAggregateRow } from './models/log-aggregate-row';
import { LogFilters } from './models/log-filters';
import { LogQuery } from './models/log-query';
import { ValidatedIngestLogs } from './models/validated-ingest-logs';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';

/** Executes log ingestion, listing, and PostgreSQL-side aggregation. */
@Injectable()
export class LogsService {
  private readonly logsServiceLogger = new Logger(LogsService.name);

  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly logQueryCursorCodec: LogQueryCursorCodec,
  ) {}

  async ingestLogs(
    ingestionRequest: ValidatedIngestLogs,
  ): Promise<IngestLogsResponseDto> {
    await this.persistLogs(ingestionRequest.logs);

    return {
      accepted: ingestionRequest.logs.length,
      rejected: ingestionRequest.rejected,
    };
  }

  async queryLogs(logQuery: LogQuery): Promise<QueryLogsResponseDto> {
    const logQueryBuilder = this.logRepository
      .createQueryBuilder('log')
      .select([
        'log.id',
        'log.timestamp',
        'log.level',
        'log.service',
        'log.message',
        'log.attributes',
      ]);

    this.applyLogFilters(logQueryBuilder, logQuery);
    this.applyPaginationCursor(logQueryBuilder, logQuery);

    try {
      const retrievedLogs = await logQueryBuilder
        .orderBy('log.timestamp', 'DESC')
        .addOrderBy('log.id', 'DESC')
        .take(logQuery.limit + 1)
        .getMany();

      return this.createPaginatedQueryResponse(retrievedLogs, logQuery.limit);
    } catch (error: unknown) {
      this.logsServiceLogger.error('Failed to query logs');
      throw new InternalServerErrorException('Failed to query logs', {
        cause: error,
      });
    }
  }

  async aggregateLogs(
    aggregateQuery: LogAggregateQuery,
  ): Promise<LogAggregateResponseDto> {
    const groupByExpression = aggregateQuery.groupBy
      ? LOG_AGGREGATE_GROUP_EXPRESSIONS[aggregateQuery.groupBy]
      : null;
    const aggregateQueryBuilder = this.logRepository
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
      aggregateQueryBuilder
        .addGroupBy(groupByExpression)
        .addOrderBy(groupByExpression, 'ASC');
    }

    this.applyLogFilters(aggregateQueryBuilder, aggregateQuery);

    try {
      const aggregateRows =
        await aggregateQueryBuilder.getRawMany<LogAggregateRow>();

      return {
        buckets: aggregateRows.map(
          (aggregateRow: LogAggregateRow): LogAggregateBucketDto =>
            this.mapAggregateRowToBucket(aggregateRow),
        ),
      };
    } catch (error: unknown) {
      this.logsServiceLogger.error('Failed to aggregate logs');
      throw new InternalServerErrorException('Failed to aggregate logs', {
        cause: error,
      });
    }
  }

  private async persistLogs(validatedLogs: readonly LogEntry[]): Promise<void> {
    try {
      await this.logRepository.insert([...validatedLogs]);
    } catch (error: unknown) {
      this.logsServiceLogger.error('Failed to persist an ingestion batch');
      throw new InternalServerErrorException('Failed to ingest logs', {
        cause: error,
      });
    }
  }

  private applyLogFilters(
    logQueryBuilder: SelectQueryBuilder<Log>,
    logFilters: LogFilters,
  ): void {
    if (logFilters.service !== undefined) {
      logQueryBuilder.andWhere('log.service = :service', {
        service: logFilters.service,
      });
    }

    if (logFilters.level !== undefined) {
      logQueryBuilder.andWhere('log.level = :level', {
        level: logFilters.level,
      });
    }

    if (logFilters.since !== undefined) {
      logQueryBuilder.andWhere('log.timestamp >= :since', {
        since: logFilters.since,
      });
    }

    if (logFilters.until !== undefined) {
      logQueryBuilder.andWhere('log.timestamp < :until', {
        until: logFilters.until,
      });
    }

    if (logFilters.messageQuery !== undefined) {
      logQueryBuilder.andWhere("log.message ILIKE :messageQuery ESCAPE '\\'", {
        messageQuery: `%${this.escapeLikePattern(logFilters.messageQuery)}%`,
      });
    }

    Object.entries(logFilters.attributes).forEach(
      ([attributeName, attributeValue], attributeFilterIndex): void => {
        logQueryBuilder.andWhere(
          `log.attributes ->> :attributeName${attributeFilterIndex} = :attributeValue${attributeFilterIndex}`,
          {
            [`attributeName${attributeFilterIndex}`]: attributeName,
            [`attributeValue${attributeFilterIndex}`]: attributeValue,
          },
        );
      },
    );
  }

  private applyPaginationCursor(
    logQueryBuilder: SelectQueryBuilder<Log>,
    logQuery: LogQuery,
  ): void {
    if (logQuery.cursor !== undefined) {
      logQueryBuilder.andWhere(
        '(log.timestamp, log.id) < (:cursorTimestamp, :cursorId)',
        {
          cursorTimestamp: logQuery.cursor.timestamp,
          cursorId: logQuery.cursor.id,
        },
      );
    }
  }

  private mapAggregateRowToBucket(
    aggregateRow: LogAggregateRow,
  ): LogAggregateBucketDto {
    const bucketStart =
      aggregateRow.start instanceof Date
        ? aggregateRow.start
        : new Date(aggregateRow.start);

    return {
      start: bucketStart.toISOString(),
      group: aggregateRow.group,
      count: Number(aggregateRow.count),
    };
  }

  private createPaginatedQueryResponse(
    retrievedLogs: readonly Log[],
    resultLimit: number,
  ): QueryLogsResponseDto {
    const hasMoreResults = retrievedLogs.length > resultLimit;
    const pageLogs = hasMoreResults
      ? retrievedLogs.slice(0, resultLimit)
      : retrievedLogs;
    const lastPageLog = pageLogs.at(-1);

    return {
      logs: pageLogs.map((storedLog: Log): LogResponseDto =>
        this.mapStoredLogToResponse(storedLog),
      ),
      next_cursor:
        hasMoreResults && lastPageLog
          ? this.logQueryCursorCodec.encode({
              timestamp: lastPageLog.timestamp,
              id: lastPageLog.id,
            })
          : null,
    };
  }

  private mapStoredLogToResponse(storedLog: Log): LogResponseDto {
    return {
      id: storedLog.id,
      timestamp: storedLog.timestamp.toISOString(),
      level: storedLog.level,
      service: storedLog.service,
      message: storedLog.message,
      attributes: storedLog.attributes,
    };
  }

  private escapeLikePattern(searchText: string): string {
    return searchText.replace(/[\\%_]/g, '\\$&');
  }
}
