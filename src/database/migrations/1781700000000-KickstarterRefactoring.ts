import { MigrationInterface, QueryRunner } from 'typeorm';

export class KickstarterRefactoring1781700000000 implements MigrationInterface {
  name = 'KickstarterRefactoring1781700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Borrar todos los proyectos existentes (el modelo de dueño es incompatible)
    //    Las tablas dependientes (project_documents, project_role_requirements,
    //    affinity_scores, applications, team_members, calendar_events) se limpian en cascada.
    await queryRunner.query(`DELETE FROM "projects"`);

    // 2. Agregar subtipo a personas naturales
    await queryRunner.query(
      `CREATE TYPE "public"."natural_person_profiles_subtype_enum" AS ENUM('creator', 'developer')`,
    );
    await queryRunner.query(
      `ALTER TABLE "natural_person_profiles" ADD "subtype" "public"."natural_person_profiles_subtype_enum"`,
    );

    // 3. Reemplazar el enum de estado del proyecto
    //    Anterior: draft | published | in_progress | finished | cancelled
    //    Nuevo:    draft | open | negotiating | funded | seeking_team | in_progress | finished | cancelled
    await queryRunner.query(
      `ALTER TYPE "public"."projects_status_enum" RENAME TO "projects_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('draft', 'open', 'negotiating', 'funded', 'seeking_team', 'in_progress', 'finished', 'cancelled')`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."projects_status_enum" USING "status"::text::"public"."projects_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft'`);
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum_old"`);

    // 4. Cambiar dueño del proyecto: empresa → creador (persona natural)
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "company_id"`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "creator_id" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_creator_id" FOREIGN KEY ("creator_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE`,
    );

    // 5. Agregar meta de financiamiento al proyecto
    await queryRunner.query(
      `ALTER TABLE "projects" ADD "funding_goal" numeric(14,2)`,
    );

    // 6. Eliminar tabla de documentos (reemplazada por project_media)
    await queryRunner.query(`DROP TABLE IF EXISTS "project_documents"`);

    // 7. Crear tabla de multimedia del proyecto
    await queryRunner.query(
      `CREATE TYPE "public"."project_media_type_enum" AS ENUM('image', 'video', 'document')`,
    );
    await queryRunner.query(`
      CREATE TABLE "project_media" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "type" "public"."project_media_type_enum" NOT NULL,
        "name" character varying(150) NOT NULL,
        "file_url" character varying(500) NOT NULL,
        "is_public" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_project_media" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_media_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // 8. Crear tabla de ofertas de financiamiento (negociación multi-ronda)
    await queryRunner.query(
      `CREATE TYPE "public"."funding_offers_status_enum" AS ENUM('pending', 'countered', 'accepted', 'rejected')`,
    );
    await queryRunner.query(`
      CREATE TABLE "funding_offers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "company_id" uuid NOT NULL,
        "amount" numeric(14,2) NOT NULL,
        "message" text,
        "round" integer NOT NULL DEFAULT 1,
        "parent_offer_id" uuid,
        "status" "public"."funding_offers_status_enum" NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_funding_offers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_funding_offers_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_funding_offers_company_id" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_funding_offers_parent_offer_id" FOREIGN KEY ("parent_offer_id") REFERENCES "funding_offers"("id") ON DELETE SET NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar tablas nuevas
    await queryRunner.query(`DROP TABLE IF EXISTS "funding_offers"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."funding_offers_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "project_media"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."project_media_type_enum"`);

    // Restaurar project_documents
    await queryRunner.query(`
      CREATE TABLE "project_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "project_id" uuid NOT NULL,
        "name" character varying(150) NOT NULL,
        "file_url" character varying(500) NOT NULL,
        "is_public" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_c0d7fa982569e84a809aa2ff5d2" PRIMARY KEY ("id"),
        CONSTRAINT "FK_project_documents_project_id" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
      )
    `);

    // Restaurar columna funding_goal
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "funding_goal"`);

    // Restaurar dueño a empresa
    await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_creator_id"`);
    await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN IF EXISTS "creator_id"`);
    await queryRunner.query(`ALTER TABLE "projects" ADD "company_id" uuid NOT NULL DEFAULT gen_random_uuid()`);
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_company_id" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "company_id" DROP DEFAULT`);

    // Restaurar enum de estado
    await queryRunner.query(
      `ALTER TYPE "public"."projects_status_enum" RENAME TO "projects_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('draft', 'published', 'in_progress', 'finished', 'cancelled')`,
    );
    await queryRunner.query(`DELETE FROM "projects"`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE "public"."projects_status_enum" USING "status"::text::"public"."projects_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'draft'`);
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum_old"`);

    // Eliminar subtype de personas naturales
    await queryRunner.query(`ALTER TABLE "natural_person_profiles" DROP COLUMN "subtype"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."natural_person_profiles_subtype_enum"`);
  }
}
