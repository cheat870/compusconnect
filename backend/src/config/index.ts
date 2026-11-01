import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseDatabaseUrl(urlStr?: string) {
  if (!urlStr) return null;
  try {
    const parsed = new URL(urlStr);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      name: parsed.pathname ? parsed.pathname.replace(/^\//, '') : undefined,
      ssl: parsed.searchParams.get('ssl') ? { rejectUnauthorized: false } : undefined,
    };
  } catch (e) {
    return null;
  }
}

const dbUrlConfig = parseDatabaseUrl(process.env.DATABASE_URL || process.env.MYSQL_URL);

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  db: {
    host: dbUrlConfig?.host || process.env.DB_HOST || 'localhost',
    port: dbUrlConfig?.port || parseInt(process.env.DB_PORT || '3306', 10),
    user: dbUrlConfig?.user || process.env.DB_USER || 'root',
    password: dbUrlConfig?.password || process.env.DB_PASSWORD || '',
    name: process.env.NODE_ENV === 'test' 
      ? (process.env.DB_TEST_NAME || 'campusconnect_test') 
      : (dbUrlConfig?.name || process.env.DB_NAME || 'campusconnect'),
    ssl: (
      process.env.DB_SSL === 'true' ||
      !!dbUrlConfig?.ssl ||
      process.env.DB_PORT === '4000' ||
      (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')) ||
      (dbUrlConfig?.host && dbUrlConfig.host.includes('tidbcloud.com')) ||
      (process.env.NODE_ENV === 'production' && (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1'))
    )
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: false }
      : undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'campusconnect_default_development_secret_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
};
