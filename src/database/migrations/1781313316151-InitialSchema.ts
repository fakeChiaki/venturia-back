import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1781313316151 implements MigrationInterface {
  name = 'InitialSchema1781313316151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "interest_areas" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_30275be4f80f0e6bb5c44d13745" UNIQUE ("name"), CONSTRAINT "PK_64ecbbc4bd7fbbdea498aa3d30d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "technical_areas" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, CONSTRAINT "UQ_00efd5662434bf35984e1797102" UNIQUE ("name"), CONSTRAINT "PK_4e4f5cc72c26f63ad264c9828c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."natural_person_profiles_methodology_enum" AS ENUM('scrum', 'kanban', 'scrumban', 'xp', 'waterfall', 'lean')`,
    );
    await queryRunner.query(
      `CREATE TABLE "natural_person_profiles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "full_name" character varying(150) NOT NULL, "photo_url" character varying(500), "cv_url" character varying(500), "technical_area_id" integer, "methodology" "public"."natural_person_profiles_methodology_enum", "weekly_hours" integer, "availability" jsonb, "onboarding_completed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_96126804ae7fc12188d900c7a39" UNIQUE ("user_id"), CONSTRAINT "REL_96126804ae7fc12188d900c7a3" UNIQUE ("user_id"), CONSTRAINT "PK_439153a9fc54ef78b0465ab9389" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_type_enum" AS ENUM('natural_person', 'company')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_provider_enum" AS ENUM('local', 'google')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "email" character varying(255) NOT NULL, "password_hash" character varying(255), "type" "public"."users_type_enum" NOT NULL, "provider" "public"."users_provider_enum" NOT NULL DEFAULT 'local', "google_id" character varying(255), "is_active" boolean NOT NULL DEFAULT true, "email_verified" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "company_owners" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "company_profile_id" uuid NOT NULL, "full_name" character varying(150) NOT NULL, "rut" character varying(12) NOT NULL, "email" character varying(255), "phone" character varying(30), CONSTRAINT "UQ_97e94bdd492a40a1d00466931b3" UNIQUE ("company_profile_id", "rut"), CONSTRAINT "PK_306cdb891ecb5d8973f80461493" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_profiles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "company_name" character varying(150) NOT NULL, "address" character varying(255) NOT NULL, "phone" character varying(30) NOT NULL, "business_hours" jsonb, "policies" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d06e08f04b51637dffa0ff16850" UNIQUE ("user_id"), CONSTRAINT "REL_d06e08f04b51637dffa0ff1685" UNIQUE ("user_id"), CONSTRAINT "PK_1980200b310bd1e2ac86aa1ae4a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "file_url" character varying(500) NOT NULL, "is_public" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c0d7fa982569e84a809aa2ff5d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "project_role_requirements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "role_id" integer NOT NULL, "quantity" integer NOT NULL DEFAULT '1', CONSTRAINT "UQ_382c362a1a364a294c99d926b0c" UNIQUE ("project_id", "role_id"), CONSTRAINT "CHK_dc8a7d88995d9a3c0e34cb2d91" CHECK ("quantity" > 0), CONSTRAINT "PK_f1fdb6ff0c3658c38c1dcc04869" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_methodology_enum" AS ENUM('scrum', 'kanban', 'scrumban', 'xp', 'waterfall', 'lean')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."projects_status_enum" AS ENUM('draft', 'published', 'team_complete', 'in_progress', 'finished', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "company_id" uuid NOT NULL, "name" character varying(150) NOT NULL, "image_url" character varying(500), "description" text NOT NULL, "technical_area_id" integer NOT NULL, "methodology" "public"."projects_methodology_enum" NOT NULL, "schedule" jsonb, "weekly_hours" integer, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'draft', "field_visibility" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bed9c4e82db2181511def60a6a" ON "projects" ("technical_area_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a27865a7be17886e3088f4a650" ON "projects" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "affinity_scores" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "profile_id" uuid NOT NULL, "project_id" uuid NOT NULL, "score" numeric(5,2) NOT NULL, "breakdown" jsonb, "computed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_fbffb5484142d2e26ab93da9708" UNIQUE ("profile_id", "project_id"), CONSTRAINT "PK_71a873416af1a937b1c1360912f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b3b73bb254b8f3660fa6496328" ON "affinity_scores" ("profile_id", "score") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."applications_status_enum" AS ENUM('pending', 'in_review', 'accepted', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "applications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "applicant_id" uuid NOT NULL, "role_id" integer NOT NULL, "status" "public"."applications_status_enum" NOT NULL DEFAULT 'pending', "message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_70380266e967f5cc2c2274dbe84" UNIQUE ("project_id", "applicant_id"), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8ee114cee92e995a9e75c05cfb" ON "applications" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "team_members" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "profile_id" uuid NOT NULL, "role_id" integer NOT NULL, "application_id" uuid, "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_81406ccafe08f2aa7a55597aad1" UNIQUE ("application_id"), CONSTRAINT "UQ_fe0dfe7b1831e8c034762d39cd5" UNIQUE ("project_id", "profile_id"), CONSTRAINT "REL_81406ccafe08f2aa7a55597aad" UNIQUE ("application_id"), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."calendar_events_status_enum" AS ENUM('pending', 'scheduled', 'synced', 'failed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "calendar_events" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "project_id" uuid NOT NULL, "title" character varying(150) NOT NULL, "description" text, "starts_at" TIMESTAMP WITH TIME ZONE, "ends_at" TIMESTAMP WITH TIME ZONE, "google_event_id" character varying(255), "status" "public"."calendar_events_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_faf5391d232322a87cdd1c6f30c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('account_created', 'account_deleted', 'application_in_review', 'application_accepted', 'application_rejected', 'team_completed', 'event_scheduled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "payload" jsonb, "is_read" boolean NOT NULL DEFAULT false, "email_sent_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_310667f935698fcd8cb319113a" ON "notifications" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_roles" ("profile_id" uuid NOT NULL, "role_id" integer NOT NULL, CONSTRAINT "PK_1e402246c6a6d6102b494e60abd" PRIMARY KEY ("profile_id", "role_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_356ec0081288990bf3424b8eb0" ON "profile_roles" ("profile_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ca8303fd61e2571e8818de7943" ON "profile_roles" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "profile_interest_areas" ("profile_id" uuid NOT NULL, "interest_area_id" integer NOT NULL, CONSTRAINT "PK_836ed85d4de88a57ce07dc02d86" PRIMARY KEY ("profile_id", "interest_area_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2536723fe387c1d716796e1b05" ON "profile_interest_areas" ("profile_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a874610472723f01c62216840f" ON "profile_interest_areas" ("interest_area_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "project_interest_areas" ("project_id" uuid NOT NULL, "interest_area_id" integer NOT NULL, CONSTRAINT "PK_c9e7cc9aa830b2ef0eea413d433" PRIMARY KEY ("project_id", "interest_area_id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15dea0a2126475525babff2717" ON "project_interest_areas" ("project_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e10d0e94b1c848591af481ed80" ON "project_interest_areas" ("interest_area_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "natural_person_profiles" ADD CONSTRAINT "FK_96126804ae7fc12188d900c7a39" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "natural_person_profiles" ADD CONSTRAINT "FK_df59f4197ddc155500da59212cf" FOREIGN KEY ("technical_area_id") REFERENCES "technical_areas"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_owners" ADD CONSTRAINT "FK_dfe888260d31a98fa21340bbd2a" FOREIGN KEY ("company_profile_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_profiles" ADD CONSTRAINT "FK_d06e08f04b51637dffa0ff16850" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" ADD CONSTRAINT "FK_ce91a721e078a2d9852b61ad8f2" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_role_requirements" ADD CONSTRAINT "FK_bebd9e2934c6b2ead60bc52b0ad" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_role_requirements" ADD CONSTRAINT "FK_29d4158896a4a985cbca1bd7523" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_c8708288b8e6a060ed7b9e1a226" FOREIGN KEY ("company_id") REFERENCES "company_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_bed9c4e82db2181511def60a6ae" FOREIGN KEY ("technical_area_id") REFERENCES "technical_areas"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "affinity_scores" ADD CONSTRAINT "FK_a0b7f9d2f81e30b0d2138d28f45" FOREIGN KEY ("profile_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "affinity_scores" ADD CONSTRAINT "FK_94d92095690f4fd6beac2e66726" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_195e4ab3a0c3d55aa2d1e35a3bb" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_194d0fca275b8661a56e486cb64" FOREIGN KEY ("applicant_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_0765275891b64a32533bf3e30e3" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_8fc7868d38fb2f3c63ab17d803e" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_a7343b1de075d160a5ed57f1338" FOREIGN KEY ("profile_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_7a4dbecafed7033ca58a453a42e" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_81406ccafe08f2aa7a55597aad1" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_events" ADD CONSTRAINT "FK_8d3f6704ad4fa57693de4bbced9" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_roles" ADD CONSTRAINT "FK_356ec0081288990bf3424b8eb02" FOREIGN KEY ("profile_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_roles" ADD CONSTRAINT "FK_ca8303fd61e2571e8818de7943a" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_interest_areas" ADD CONSTRAINT "FK_2536723fe387c1d716796e1b05f" FOREIGN KEY ("profile_id") REFERENCES "natural_person_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_interest_areas" ADD CONSTRAINT "FK_a874610472723f01c62216840ff" FOREIGN KEY ("interest_area_id") REFERENCES "interest_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_interest_areas" ADD CONSTRAINT "FK_15dea0a2126475525babff2717c" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_interest_areas" ADD CONSTRAINT "FK_e10d0e94b1c848591af481ed809" FOREIGN KEY ("interest_area_id") REFERENCES "interest_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_interest_areas" DROP CONSTRAINT "FK_e10d0e94b1c848591af481ed809"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_interest_areas" DROP CONSTRAINT "FK_15dea0a2126475525babff2717c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_interest_areas" DROP CONSTRAINT "FK_a874610472723f01c62216840ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_interest_areas" DROP CONSTRAINT "FK_2536723fe387c1d716796e1b05f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_roles" DROP CONSTRAINT "FK_ca8303fd61e2571e8818de7943a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_roles" DROP CONSTRAINT "FK_356ec0081288990bf3424b8eb02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "calendar_events" DROP CONSTRAINT "FK_8d3f6704ad4fa57693de4bbced9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_81406ccafe08f2aa7a55597aad1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_7a4dbecafed7033ca58a453a42e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_a7343b1de075d160a5ed57f1338"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_8fc7868d38fb2f3c63ab17d803e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_0765275891b64a32533bf3e30e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_194d0fca275b8661a56e486cb64"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_195e4ab3a0c3d55aa2d1e35a3bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affinity_scores" DROP CONSTRAINT "FK_94d92095690f4fd6beac2e66726"`,
    );
    await queryRunner.query(
      `ALTER TABLE "affinity_scores" DROP CONSTRAINT "FK_a0b7f9d2f81e30b0d2138d28f45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_bed9c4e82db2181511def60a6ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_c8708288b8e6a060ed7b9e1a226"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_role_requirements" DROP CONSTRAINT "FK_29d4158896a4a985cbca1bd7523"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_role_requirements" DROP CONSTRAINT "FK_bebd9e2934c6b2ead60bc52b0ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_documents" DROP CONSTRAINT "FK_ce91a721e078a2d9852b61ad8f2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_profiles" DROP CONSTRAINT "FK_d06e08f04b51637dffa0ff16850"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_owners" DROP CONSTRAINT "FK_dfe888260d31a98fa21340bbd2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "natural_person_profiles" DROP CONSTRAINT "FK_df59f4197ddc155500da59212cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "natural_person_profiles" DROP CONSTRAINT "FK_96126804ae7fc12188d900c7a39"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e10d0e94b1c848591af481ed80"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15dea0a2126475525babff2717"`,
    );
    await queryRunner.query(`DROP TABLE "project_interest_areas"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a874610472723f01c62216840f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2536723fe387c1d716796e1b05"`,
    );
    await queryRunner.query(`DROP TABLE "profile_interest_areas"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ca8303fd61e2571e8818de7943"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_356ec0081288990bf3424b8eb0"`,
    );
    await queryRunner.query(`DROP TABLE "profile_roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_310667f935698fcd8cb319113a"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TABLE "calendar_events"`);
    await queryRunner.query(`DROP TYPE "public"."calendar_events_status_enum"`);
    await queryRunner.query(`DROP TABLE "team_members"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8ee114cee92e995a9e75c05cfb"`,
    );
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TYPE "public"."applications_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b3b73bb254b8f3660fa6496328"`,
    );
    await queryRunner.query(`DROP TABLE "affinity_scores"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a27865a7be17886e3088f4a650"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bed9c4e82db2181511def60a6a"`,
    );
    await queryRunner.query(`DROP TABLE "projects"`);
    await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."projects_methodology_enum"`);
    await queryRunner.query(`DROP TABLE "project_role_requirements"`);
    await queryRunner.query(`DROP TABLE "project_documents"`);
    await queryRunner.query(`DROP TABLE "company_profiles"`);
    await queryRunner.query(`DROP TABLE "company_owners"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_type_enum"`);
    await queryRunner.query(`DROP TABLE "natural_person_profiles"`);
    await queryRunner.query(
      `DROP TYPE "public"."natural_person_profiles_methodology_enum"`,
    );
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "technical_areas"`);
    await queryRunner.query(`DROP TABLE "interest_areas"`);
  }
}
