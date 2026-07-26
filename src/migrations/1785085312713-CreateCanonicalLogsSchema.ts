import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCanonicalLogsSchema1785085312713 implements MigrationInterface {
    name = 'CreateCanonicalLogsSchema1785085312713'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."logs_level_enum" AS ENUM('debug', 'info', 'warn', 'error')`);
        await queryRunner.query(`CREATE TABLE "logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "level" "public"."logs_level_enum" NOT NULL, "service" text NOT NULL, "message" text NOT NULL, "attributes" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "chk_logs_message_non_empty" CHECK (char_length("message") > 0), CONSTRAINT "chk_logs_service_non_empty" CHECK (char_length("service") > 0), CONSTRAINT "pk_logs" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "logs"`);
        await queryRunner.query(`DROP TYPE "public"."logs_level_enum"`);
    }

}
