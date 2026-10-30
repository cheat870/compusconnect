import { createApp } from './app.js';
import { config } from './config/index.js';
import { getPool } from './database/connection.js';

const app = createApp();

async function startServer() {
  // Start server first so cloud deployment health-checks pass immediately
  const server = app.listen(config.port, () => {
    console.log(`[Server] CampusConnect Backend running on port ${config.port}`);
    console.log(`[Server] Pilot Institution: Royal University of Phnom Penh (RUPP)`);
    console.log(`[Server] Health Check: http://localhost:${config.port}/api/v1/health`);
  });

  // Verify DB connection asynchronously
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log(`[Database] Connected successfully to MySQL (${config.db.name}) on ${config.db.host}:${config.db.port}`);
  } catch (err: any) {
    console.warn(`[Database Warning] MySQL connection failed (${err.code || err.message}).`);
    console.warn(`[Database Warning] If deploying on Render, please set your Database Environment Variables:`);
    console.warn(`  - DB_HOST (e.g. TiDB Cloud / Aiven / Railway host)`);
    console.warn(`  - DB_PORT (e.g. 3306 or 4000)`);
    console.warn(`  - DB_USER`);
    console.warn(`  - DB_PASSWORD`);
    console.warn(`  - DB_NAME`);
    console.warn(`  - Or provide DATABASE_URL / MYSQL_URL`);
    console.warn(`[Server Notice] The web server remains active so health checks continue to pass.`);
  }
}

startServer();
