import { registerAs } from '@nestjs/config';
import { buildDataSourceOptions } from '../database/typeorm-options';

export default registerAs('database', () => buildDataSourceOptions());
