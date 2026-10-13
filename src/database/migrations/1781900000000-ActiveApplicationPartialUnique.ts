import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActiveApplicationPartialUnique1781900000000 implements MigrationInterface {
  name = 'ActiveApplicationPartialUnique1781900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "UQ_70380266e967f5cc2c2274dbe84"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_active_application" ON "applications" ("project_id", "applicant_id") WHERE status IN ('pending', 'in_review', 'accepted')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_active_application"`);
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "UQ_70380266e967f5cc2c2274dbe84" UNIQUE ("project_id", "applicant_id")`,
    );
  }
}
