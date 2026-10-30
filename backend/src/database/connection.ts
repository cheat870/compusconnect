import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { config } from '../config/index.js';

let pool: Pool | null = null;
let currentDb: string | null = null;

export function getPool(overrideDatabase?: string): Pool {
  const targetDb = overrideDatabase || (process.env.NODE_ENV === 'test' ? (process.env.DB_TEST_NAME || 'campusconnect_test') : config.db.name);
  if (!pool || (currentDb && currentDb !== targetDb)) {
    if (pool) {
      pool.end();
    }
    currentDb = targetDb;
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: targetDb,
      waitForConnections: true,
      connectionLimit: 30,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: '+07:00', // Asia/Phnom_Penh (UTC+7)
      multipleStatements: true,
      ...(config.db.ssl ? { ssl: config.db.ssl } : {}),
    });
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}

export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await getPool().getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    currentDb = null;
  }
}
