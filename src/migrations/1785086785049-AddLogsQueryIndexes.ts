import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogsQueryIndexes1785086785049
  implements MigrationInterface
{
  name = 'AddLogsQueryIndexes1785086785049';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await queryRunner.query(`
      CREATE INDEX idx_logs_service_timestamp_id
      ON logs (service, timestamp, id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_logs_level_timestamp_id
      ON logs (level, timestamp, id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_logs_message_trgm
      ON logs USING gin (message gin_trgm_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX idx_logs_message_trgm');
    await queryRunner.query('DROP INDEX idx_logs_level_timestamp_id');
    await queryRunner.query('DROP INDEX idx_logs_service_timestamp_id');
  }
}
