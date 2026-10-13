import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhotoUrlToCompanyProfile1781800000000 implements MigrationInterface {
  name = 'AddPhotoUrlToCompanyProfile1781800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_profiles" ADD "photo_url" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_profiles" DROP COLUMN "photo_url"`);
  }
}
