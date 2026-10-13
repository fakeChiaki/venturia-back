import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm-options';

// Punto de entrada del CLI de TypeORM (migration:generate / run / revert)
export default new DataSource(buildDataSourceOptions());
