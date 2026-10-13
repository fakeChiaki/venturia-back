import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimezoneToProfile1781497737514 implements MigrationInterface {
    name = 'AddTimezoneToProfile1781497737514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "natural_person_profiles" ADD "timezone" character varying(100)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "natural_person_profiles" DROP COLUMN "timezone"`);
    }

}
