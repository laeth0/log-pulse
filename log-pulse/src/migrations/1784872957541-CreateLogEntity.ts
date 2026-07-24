import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLogEntity1784872957541 implements MigrationInterface {
    name = 'CreateLogEntity1784872957541'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."logs_level_enum" AS ENUM('debug', 'info', 'warn', 'error')`);
        await queryRunner.query(`CREATE TABLE "logs" ("id" BIGSERIAL NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "level" "public"."logs_level_enum" NOT NULL, "service" character varying(255) NOT NULL, "message" text NOT NULL, "attributes" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_logs_timestamp" ON "logs"  ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "idx_logs_level_timestamp" ON "logs"  ("level", "timestamp") `);
        await queryRunner.query(`CREATE INDEX "idx_logs_service_timestamp" ON "logs"  ("service", "timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_logs_service_timestamp"`);
        await queryRunner.query(`DROP INDEX "public"."idx_logs_level_timestamp"`);
        await queryRunner.query(`DROP INDEX "public"."idx_logs_timestamp"`);
        await queryRunner.query(`DROP TABLE "logs"`);
        await queryRunner.query(`DROP TYPE "public"."logs_level_enum"`);
    }

}
