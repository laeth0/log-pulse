import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogMessageSearchIndex1784875000000 implements MigrationInterface {
  readonly name = 'AddLogMessageSearchIndex1784875000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    await queryRunner.query(
      'CREATE INDEX "idx_logs_message_trgm" ON "logs" USING GIN ("message" gin_trgm_ops)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "public"."idx_logs_message_trgm"',
    );
  }
}
