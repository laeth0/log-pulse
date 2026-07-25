import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

import { LOG_RETENTION_ADVISORY_LOCK_ID } from '../../common/const/log-retention.const';

@Injectable()
export class LogRetentionRepository {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  createQueryRunner(): QueryRunner {
    return this.dataSource.createQueryRunner();
  }

  async acquireLock(queryRunner: QueryRunner): Promise<boolean> {
    const result: unknown = await queryRunner.query(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [LOG_RETENTION_ADVISORY_LOCK_ID],
    );
    const acquired = this.readFirstField(result, 'acquired');

    if (typeof acquired !== 'boolean') {
      throw new Error('PostgreSQL returned an invalid advisory-lock result');
    }

    return acquired;
  }

  async releaseLock(queryRunner: QueryRunner): Promise<void> {
    const result: unknown = await queryRunner.query(
      'SELECT pg_advisory_unlock($1) AS released',
      [LOG_RETENTION_ADVISORY_LOCK_ID],
    );
    const released = this.readFirstField(result, 'released');

    if (released !== true) {
      throw new Error('PostgreSQL did not release the retention advisory lock');
    }
  }

  async deleteBatch(
    queryRunner: QueryRunner,
    expirationThreshold: Date,
    batchSize: number,
  ): Promise<number> {
    const result: unknown = await queryRunner.query(
      `
        WITH expired_logs AS (
          SELECT "id"
          FROM "logs"
          WHERE "timestamp" < $1
          ORDER BY "timestamp" ASC, "id" ASC
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        ),
        deleted_logs AS (
          DELETE FROM "logs" AS log
          USING expired_logs
          WHERE log."id" = expired_logs."id"
          RETURNING 1
        )
        SELECT COUNT(*)::int AS deleted_count
        FROM deleted_logs
      `,
      [expirationThreshold, batchSize],
    );
    const deletedCount = this.readFirstField(result, 'deleted_count');

    if (
      typeof deletedCount !== 'number' ||
      !Number.isSafeInteger(deletedCount) ||
      deletedCount < 0
    ) {
      throw new Error('PostgreSQL returned an invalid retention delete count');
    }

    return deletedCount;
  }

  async hasBacklog(
    queryRunner: QueryRunner,
    expirationThreshold: Date,
  ): Promise<boolean> {
    const result: unknown = await queryRunner.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM "logs"
          WHERE "timestamp" < $1
          LIMIT 1
        ) AS has_backlog
      `,
      [expirationThreshold],
    );
    const hasBacklog = this.readFirstField(result, 'has_backlog');

    if (typeof hasBacklog !== 'boolean') {
      throw new Error(
        'PostgreSQL returned an invalid retention backlog result',
      );
    }

    return hasBacklog;
  }

  private readFirstField(result: unknown, fieldName: string): unknown {
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('PostgreSQL returned no retention result row');
    }

    const firstRow: unknown = result[0];
    if (
      typeof firstRow !== 'object' ||
      firstRow === null ||
      !Object.prototype.hasOwnProperty.call(firstRow, fieldName)
    ) {
      throw new Error('PostgreSQL returned a malformed retention result row');
    }

    return Reflect.get(firstRow, fieldName);
  }
}
