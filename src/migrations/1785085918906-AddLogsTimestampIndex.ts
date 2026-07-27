import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogsTimestampIndex1785085918906
  implements MigrationInterface
{
  name = 'AddLogsTimestampIndex1785085918906';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_logs_timestamp_id
      ON logs (timestamp, id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_logs_timestamp_id
    `);
  }
}
