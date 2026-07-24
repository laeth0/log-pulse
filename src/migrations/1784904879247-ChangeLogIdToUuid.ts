import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeLogIdToUuid1784904879247 implements MigrationInterface {
    name = 'ChangeLogIdToUuid1784904879247'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_logs_timestamp"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "logs" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "logs" ADD CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id")`);
        await queryRunner.query(`CREATE INDEX "idx_logs_timestamp_id_desc" ON "logs"  ("timestamp", "id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_logs_timestamp_id_desc"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba"`);
        await queryRunner.query(`ALTER TABLE "logs" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "logs" ADD "id" BIGSERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "logs" ADD CONSTRAINT "PK_fb1b805f2f7795de79fa69340ba" PRIMARY KEY ("id")`);
        await queryRunner.query(`CREATE INDEX "idx_logs_timestamp" ON "logs" USING btree ("timestamp") `);
    }

}
