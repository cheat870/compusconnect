import { createApp } from './app.js';
import { config } from './config/index.js';
import { getPool } from './database/connection.js';

const app = createApp();

async function startServer() {
  try {
    // Verify DB connection
    const pool = getPool();
    await pool.query('SELECT 1');
    console.log(`[Database] Connected to MySQL (${config.db.name}) on ${config.db.host}:${config.db.port}`);

    app.listen(config.port, () => {
      console.log(`[Server] CampusConnect Backend running on http://localhost:${config.port}`);
      console.log(`[Server] Pilot Institution: Royal University of Phnom Penh (RUPP)`);
      console.log(`[Server] Health Check: http://localhost:${config.port}/api/v1/health`);
    });
  } catch (err) {
    console.error('[Server] Failed to initialize server:', err);
    process.exit(1);
  }
}

startServer();
