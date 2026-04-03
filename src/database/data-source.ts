import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';

// 环境变量在运行时已通过 .env 文件或系统环境加载
// 不需要显式调用 dotenv.config()
export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'together_dev',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, './migrations/*{.ts,.js}')],
  synchronize: false, // 生产环境必须关闭
  logging: process.env.NODE_ENV === 'development',
  timezone: '+08:00',
  charset: 'utf8mb4',
  migrationsTableName: 'migrations',
  migrationsRun: false, // 不自动运行，由部署脚本控制
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
