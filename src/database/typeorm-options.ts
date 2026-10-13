import { DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'venturia',
    password: process.env.DB_PASSWORD ?? 'venturia_dev',
    database: process.env.DB_NAME ?? 'venturia',
    entities: ENTITIES,
    migrations: MIGRATIONS,
    namingStrategy: new SnakeNamingStrategy(),
    // gen_random_uuid() es nativa desde Postgres 13; evita uuid-ossp
    uuidExtension: 'pgcrypto',
    synchronize: false,
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    logging: process.env.DB_LOGGING === 'true',
  };
}
