import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogQueryIndex1784874000000 implements MigrationInterface {
  readonly name = 'AddLogQueryIndex1784874000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."idx_logs_timestamp"',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_logs_timestamp_id_desc" ON "logs" ("timestamp" DESC, "id" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."idx_logs_timestamp_id_desc"',
    );
    await queryRunner.query(
      'CREATE INDEX "idx_logs_timestamp" ON "logs" ("timestamp")',
    );
  }
}
