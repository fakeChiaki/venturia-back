import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRefreshTokenHashToUser1781318557644 implements MigrationInterface {
    name = 'AddRefreshTokenHashToUser1781318557644'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "refresh_token_hash" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "refresh_token_hash"`);
    }

}
