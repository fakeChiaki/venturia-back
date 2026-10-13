import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProjectTechnicalAreasMultiSelect1781600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_technical_areas" (
        "project_id" uuid NOT NULL,
        "technical_area_id" integer NOT NULL,
        CONSTRAINT "PK_project_technical_areas" PRIMARY KEY ("project_id", "technical_area_id"),
        CONSTRAINT "FK_project_technical_areas_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_project_technical_areas_area" FOREIGN KEY ("technical_area_id")
          REFERENCES "technical_areas"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN IF EXISTS "technical_area_id"
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "project_technical_areas"`);
    await queryRunner.query(`
      ALTER TABLE "projects" ADD "technical_area_id" integer NULL
    `);
  }
}
