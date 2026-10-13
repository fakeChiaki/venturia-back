import { MigrationInterface, QueryRunner } from "typeorm";

export class TechnicalAreaMultiSelect1781492533968 implements MigrationInterface {
    name = 'TechnicalAreaMultiSelect1781492533968'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "natural_person_profiles" DROP CONSTRAINT "FK_df59f4197ddc155500da59212cf"`);
        await queryRunner.query(`CREATE TABLE "profile_technical_areas" ("profile_id" uuid NOT NULL, "technical_area_id" integer NOT NULL, CONSTRAINT "PK_597c3c7f4fb9528890040284ead" PRIMARY KEY ("profile_id", "technical_area_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cba5c1b882cb325c49589a44f9" ON "profile_technical_areas" ("profile_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b04a91cee0363cc355b62d7fcb" ON "profile_technical_areas" ("technical_area_id") `);
        await queryRunner.query(`ALTER TABLE "natural_person_profiles" DROP COLUMN "technical_area_id"`);
        await queryRunner.query(`ALTER TABLE "profile_technical_areas" ADD CONSTRAINT "FK_cba5c1b882cb325c49589a44f9a" FOREIGN KEY ("profile_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "profile_technical_areas" ADD CONSTRAINT "FK_b04a91cee0363cc355b62d7fcbb" FOREIGN KEY ("technical_area_id") REFERENCES "technical_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "profile_technical_areas" DROP CONSTRAINT "FK_b04a91cee0363cc355b62d7fcbb"`);
        await queryRunner.query(`ALTER TABLE "profile_technical_areas" DROP CONSTRAINT "FK_cba5c1b882cb325c49589a44f9a"`);
        await queryRunner.query(`ALTER TABLE "natural_person_profiles" ADD "technical_area_id" integer`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b04a91cee0363cc355b62d7fcb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cba5c1b882cb325c49589a44f9"`);
        await queryRunner.query(`DROP TABLE "profile_technical_areas"`);
        await queryRunner.query(`ALTER TABLE "natural_person_profiles" ADD CONSTRAINT "FK_df59f4197ddc155500da59212cf" FOREIGN KEY ("technical_area_id") REFERENCES "technical_areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
