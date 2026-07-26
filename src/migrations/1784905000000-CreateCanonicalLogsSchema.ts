import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCanonicalLogsSchema1784905000000
  implements MigrationInterface
{
  name = 'CreateCanonicalLogsSchema1784905000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await queryRunner.query(`
      CREATE TYPE logs_level_enum AS ENUM ('debug', 'info', 'warn', 'error')
    `);

    await queryRunner.query(`
      CREATE TABLE logs (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        timestamp timestamptz NOT NULL,
        level logs_level_enum NOT NULL,
        service text NOT NULL,
        message text NOT NULL,
        attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_logs PRIMARY KEY (id),
        CONSTRAINT chk_logs_service_non_empty CHECK (char_length(service) > 0),
        CONSTRAINT chk_logs_message_non_empty CHECK (char_length(message) > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_logs_timestamp_id
      ON logs (timestamp DESC, id DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_logs_service_timestamp_id
      ON logs (service, timestamp DESC, id DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_logs_level_timestamp_id
      ON logs (level, timestamp DESC, id DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_logs_message_trgm
      ON logs USING gin (message gin_trgm_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS logs');
    await queryRunner.query('DROP TYPE IF EXISTS logs_level_enum');
  }
}
