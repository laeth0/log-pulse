import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';

import { Log } from '../entities/log.entity';
import type { LogEntry } from '../models/log-entry';
import type { LogQuery } from '../models/log-query';

@Injectable()
export class LogsRepository {
  private readonly insertChunkSize = Number(process.env.LOG_INGEST_CHUNK_SIZE) || 1_000;

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
