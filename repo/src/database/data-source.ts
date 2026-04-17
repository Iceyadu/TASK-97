import { DataSource } from 'typeorm';
import { join } from 'path';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'meridian',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'meridian_db',
  entities: [
    join(__dirname, '..', '**', '*.entity.ts'),
    join(__dirname, '..', '**', '*.entity.js'),
  ],
  migrations: [
    join(__dirname, 'migrations', '*.ts'),
    join(__dirname, 'migrations', '*.js'),
  ],
});
