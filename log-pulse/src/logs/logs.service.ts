import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { IngestLogsDto } from './dto/ingest-logs.dto';
import { IngestLogsResponseDto } from './dto/ingest-logs-response.dto';
import { LogResponseDto } from './dto/log-response.dto';
import { QueryLogsResponseDto } from './dto/query-logs-response.dto';
import { RejectedLogDto } from './dto/rejected-log.dto';
import { Log } from './entities/log.entity';
import { LogEntryValidator } from './log-entry.validator';
import { LogEntry } from './models/log-entry';
import { LogQuery } from './models/log-query';
import { LogQueryCursorCodec } from './query/log-query-cursor.codec';

/** Coordinates validation and persistence for log ingestion. */
@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly logEntryValidator: LogEntryValidator,
    private readonly cursorCodec: LogQueryCursorCodec,
  ) {}

  async ingest(request: IngestLogsDto): Promise<IngestLogsResponseDto> {
    const acceptedLogs: LogEntry[] = [];
    const rejectedLogs: RejectedLogDto[] = [];

    request.logs.forEach((input: unknown, index: number): void => {
      const result = this.logEntryValidator.validate(input);

      if (result.isValid) {
        acceptedLogs.push(result.log);
        return;
      }

      rejectedLogs.push({ index, reason: result.reason });
    });

    const response: IngestLogsResponseDto = {
      accepted: acceptedLogs.length,
      rejected: rejectedLogs,
    };

    if (acceptedLogs.length === 0) {
      throw new BadRequestException(response);
    }

    await this.persist(acceptedLogs);
    return response;
  }

  async find(query: LogQuery): Promise<QueryLogsResponseDto> {
    const queryBuilder = this.logRepository
      .createQueryBuilder('log')
      .select([
        'log.id',
        'log.timestamp',
        'log.level',
        'log.service',
        'log.message',
        'log.attributes',
      ]);

    this.applyFilters(queryBuilder, query);

    try {
      const results = await queryBuilder
        .orderBy('log.timestamp', 'DESC')
        .addOrderBy('log.id', 'DESC')
        .take(query.limit + 1)
        .getMany();

      return this.createQueryResponse(results, query.limit);
    } catch (error: unknown) {
      this.logger.error('Failed to query logs');
      throw new InternalServerErrorException('Failed to query logs', {
        cause: error,
      });
    }
  }

  private async persist(logs: readonly LogEntry[]): Promise<void> {
    try {
      await this.logRepository.insert([...logs]);
    } catch (error: unknown) {
      this.logger.error('Failed to persist an ingestion batch');
      throw new InternalServerErrorException('Failed to ingest logs', {
        cause: error,
      });
    }
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Log>,
    query: LogQuery,
  ): void {
    if (query.service !== undefined) {
      queryBuilder.andWhere('log.service = :service', {
        service: query.service,
      });
    }

    if (query.level !== undefined) {
      queryBuilder.andWhere('log.level = :level', { level: query.level });
    }

    if (query.since !== undefined) {
      queryBuilder.andWhere('log.timestamp >= :since', { since: query.since });
    }

    if (query.until !== undefined) {
      queryBuilder.andWhere('log.timestamp < :until', { until: query.until });
    }

    if (query.messageQuery !== undefined) {
      queryBuilder.andWhere("log.message ILIKE :messageQuery ESCAPE '\\'", {
        messageQuery: `%${this.escapeLikePattern(query.messageQuery)}%`,
      });
    }

    Object.entries(query.attributes).forEach(
      ([attributeName, attributeValue], index): void => {
        queryBuilder.andWhere(
          `log.attributes ->> :attributeName${index} = :attributeValue${index}`,
          {
            [`attributeName${index}`]: attributeName,
            [`attributeValue${index}`]: attributeValue,
          },
        );
      },
    );

    if (query.cursor !== undefined) {
      queryBuilder.andWhere(
        '(log.timestamp, log.id) < (:cursorTimestamp, :cursorId)',
        {
          cursorTimestamp: query.cursor.timestamp,
          cursorId: query.cursor.id,
        },
      );
    }
  }

  private createQueryResponse(
    results: readonly Log[],
    limit: number,
  ): QueryLogsResponseDto {
    const hasMoreResults = results.length > limit;
    const page = hasMoreResults ? results.slice(0, limit) : results;
    const lastLog = page.at(-1);

    return {
      logs: page.map((log: Log): LogResponseDto => this.mapLog(log)),
      next_cursor:
        hasMoreResults && lastLog
          ? this.cursorCodec.encode({
              timestamp: lastLog.timestamp,
              id: lastLog.id,
            })
          : null,
    };
  }

  private mapLog(log: Log): LogResponseDto {
    return {
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      level: log.level,
      service: log.service,
      message: log.message,
      attributes: log.attributes,
    };
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&');
  }
}
