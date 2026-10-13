import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEstimatedPayAndApplicationSubmittedType1781470113657 implements MigrationInterface {
    name = 'AddEstimatedPayAndApplicationSubmittedType1781470113657'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "project_role_requirements" ADD "estimated_pay" numeric(12,2)`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('account_created', 'account_deleted', 'application_submitted', 'application_in_review', 'application_accepted', 'application_rejected', 'team_completed', 'event_scheduled')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('account_created', 'account_deleted', 'application_in_review', 'application_accepted', 'application_rejected', 'team_completed', 'event_scheduled')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "project_role_requirements" DROP COLUMN "estimated_pay"`);
    }

}
