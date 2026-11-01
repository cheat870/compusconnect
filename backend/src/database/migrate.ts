import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './connection.js';
import { config } from '../config/index.js';

export async function runMigrations(dbName?: string): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const targetDb = dbName || (process.env.NODE_ENV === 'test' ? 'campusconnect_test' : config.db.name);
  const pool = getPool(targetDb);
  const conn = await pool.getConnection();

  try {
    if (targetDb) {
      await conn.query(`CREATE DATABASE IF NOT EXISTS \`${targetDb}\`;`);
      await conn.query(`USE \`${targetDb}\`;`);
    }

    console.log(`[Migrations] Running migrations on database: ${targetDb}...`);
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`[Migrations] Executing ${file}...`);
      await conn.query(sql);
      console.log(`[Migrations] Successfully executed ${file}`);
    }
  } finally {
    conn.release();
  }
}

if (process.argv[1]?.includes('migrate.ts')) {
  runMigrations()
    .then(async () => {
      console.log('[Migrations] All migrations completed successfully.');
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Migrations] Migration failed:', err);
      await closePool();
      process.exit(1);
    });
}
