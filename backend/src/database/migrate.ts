import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './connection.js';

export async function runMigrations(dbName?: string): Promise<void> {
  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const pool = getPool();
  if (dbName) {
    await pool.query(`USE \`${dbName}\`;`);
  }

  console.log(`[Migrations] Running migrations on database...`);
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');
    console.log(`[Migrations] Executing ${file}...`);
    await pool.query(sql);
    console.log(`[Migrations] Successfully executed ${file}`);
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
