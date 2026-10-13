import { MigrationInterface, QueryRunner } from 'typeorm';

const TECHNICAL_AREAS = [
  'Desarrollo Web',
  'Desarrollo Móvil',
  'Data Science',
  'Inteligencia Artificial',
  'DevOps & Cloud',
  'Ciberseguridad',
  'QA & Testing',
  'Diseño UX/UI',
];

const ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'Mobile Developer',
  'UX/UI Designer',
  'QA Engineer',
  'DevOps Engineer',
  'Data Scientist',
  'Data Engineer',
  'Product Manager',
  'Scrum Master',
  'Tech Lead',
];

const INTEREST_AREAS = [
  'E-commerce',
  'Fintech',
  'Salud',
  'Educación',
  'Logística',
  'Entretenimiento',
  'Sostenibilidad',
  'Gobierno',
  'Agroindustria',
  'Turismo',
];

export class SeedCatalogs1781313400000 implements MigrationInterface {
  name = 'SeedCatalogs1781313400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const name of TECHNICAL_AREAS) {
      await queryRunner.query(
        `INSERT INTO "technical_areas" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`,
        [name],
      );
    }
    for (const name of ROLES) {
      await queryRunner.query(
        `INSERT INTO "roles" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`,
        [name],
      );
    }
    for (const name of INTEREST_AREAS) {
      await queryRunner.query(
        `INSERT INTO "interest_areas" ("name") VALUES ($1) ON CONFLICT ("name") DO NOTHING`,
        [name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "technical_areas" WHERE "name" = ANY($1)`,
      [TECHNICAL_AREAS],
    );
    await queryRunner.query(`DELETE FROM "roles" WHERE "name" = ANY($1)`, [
      ROLES,
    ]);
    await queryRunner.query(
      `DELETE FROM "interest_areas" WHERE "name" = ANY($1)`,
      [INTEREST_AREAS],
    );
  }
}
