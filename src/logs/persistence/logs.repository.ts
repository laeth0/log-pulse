import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';

import { Log } from '../entities/log.entity';
import type { LogEntry } from '../models/log-entry';
import type { LogQuery } from '../models/log-query';
import { LogFilterQueryBuilder } from './log-filter-query.builder';

/**
 * Owns TypeORM and PostgreSQL query construction for the log use cases.
 * Application services pass validated domain values and never construct SQL.
 */
@Injectable()
export class LogsRepository {
  constructor(
    @InjectRepository(Log)
    private readonly repository: Repository<Log>,
    private readonly configService: ConfigService,
    private readonly filterQueryBuilder: LogFilterQueryBuilder,
  ) {}

  async insertBatch(logEntries: readonly LogEntry[]): Promise<void> {
    if (logEntries.length === 0) {
      return;
    }

    const chunkSize = this.configService.getOrThrow<number>(
      'ingestion.chunkSize',
    );
    await this.repository.manager.transaction(async (entityManager) => {
      const transactionalRepository = entityManager.getRepository(Log);

      for (
        let chunkStart = 0;
        chunkStart < logEntries.length;
        chunkStart += chunkSize
      ) {
        await transactionalRepository.insert(
          logEntries.slice(chunkStart, chunkStart + chunkSize),
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

    this.filterQueryBuilder.apply(queryBuilder, logQuery);
    this.applyCursor(queryBuilder, logQuery);

    return queryBuilder
      .orderBy('log.timestamp', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .take(logQuery.limit + 1)
      .getMany();
  }

  private applyCursor(
    queryBuilder: SelectQueryBuilder<Log>,
    logQuery: LogQuery,
  ): void {
    if (logQuery.cursor === undefined) {
      return;
    }

    queryBuilder.andWhere(
      '(log.timestamp, log.id) < (:cursorTimestamp, :cursorId)',
      {
        cursorTimestamp: logQuery.cursor.timestamp,
        cursorId: logQuery.cursor.id,
      },
    );
  }
}
