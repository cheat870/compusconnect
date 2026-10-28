import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.NODE_ENV === 'test' ? (process.env.DB_TEST_NAME || 'campusconnect_test') : (process.env.DB_NAME || 'campusconnect'),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'campusconnect_default_development_secret_key_2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(','),
};
