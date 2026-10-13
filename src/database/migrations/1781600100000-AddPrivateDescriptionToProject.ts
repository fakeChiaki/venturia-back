import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrivateDescriptionToProject1781600100000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" ADD "private_description" text NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects" DROP COLUMN "private_description"
    `);
  }
}
