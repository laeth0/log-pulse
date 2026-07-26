import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { IngestLogsResponseDto } from './dto/ingest-logs-response.dto';
import { LogAggregateBucketDto } from './dto/log-aggregate-bucket.dto';
import { LogAggregateResponseDto } from './dto/log-aggregate-response.dto';
import { LogResponseDto } from './dto/log-response.dto';
import { QueryLogsResponseDto } from './dto/query-logs-response.dto';
import { Log } from './entities/log.entity';
import type { LogAggregateQuery } from './models/log-aggregate-query';
import type { LogAggregateRow } from './models/log-aggregate-row';
import type { LogQuery } from './models/log-query';
import type { ValidatedIngestLogs } from './models/validated-ingest-logs';
import { LogsRepository } from './persistence/logs.repository';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';

@Injectable()
export class LogsService {
  constructor(
    private readonly logsRepository: LogsRepository,
    private readonly logQueryCursorCodec: LogQueryCursorCodec,
  ) {}

  async ingestLogs(
    ingestionRequest: ValidatedIngestLogs,
  ): Promise<IngestLogsResponseDto> {
    try {
      await this.logsRepository.insertBatch(ingestionRequest.logs);
    } catch {
      throw new InternalServerErrorException('Failed to ingest logs');
    }

    return {
      accepted: ingestionRequest.logs.length,
      rejected: ingestionRequest.rejected,
    };
  }

  async queryLogs(logQuery: LogQuery): Promise<QueryLogsResponseDto> {
    try {
      const retrievedLogs = await this.logsRepository.findPage(logQuery);

      return this.createPaginatedQueryResponse(retrievedLogs, logQuery);
    } catch {
      throw new InternalServerErrorException('Failed to query logs');
    }
  }

  async aggregateLogs(
    aggregateQuery: LogAggregateQuery,
  ): Promise<LogAggregateResponseDto> {
    try {
      const aggregateRows = await this.logsRepository.aggregate(aggregateQuery);

      return {
        buckets: aggregateRows.map(
          (aggregateRow: LogAggregateRow): LogAggregateBucketDto =>
            this.mapAggregateRowToBucket(aggregateRow),
        ),
      };
    } catch {
      throw new InternalServerErrorException('Failed to aggregate logs');
    }
  }

  private mapAggregateRowToBucket(
    aggregateRow: LogAggregateRow,
  ): LogAggregateBucketDto {
    return {
      start: aggregateRow.start.toISOString(),
      group: aggregateRow.group,
      count: aggregateRow.count,
    };
  }

  private createPaginatedQueryResponse(
    retrievedLogs: readonly Log[],
    logQuery: LogQuery,
  ): QueryLogsResponseDto {
    const resultLimit = logQuery.limit;
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
}
