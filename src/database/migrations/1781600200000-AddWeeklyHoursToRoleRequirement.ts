import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeeklyHoursToRoleRequirement1781600200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_role_requirements" ADD "weekly_hours" integer NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "project_role_requirements" DROP COLUMN "weekly_hours"
    `);
  }
}
