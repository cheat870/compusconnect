import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/index.js';

import authRoutes from './routes/auth.routes.js';
import universityRoutes from './routes/university.routes.js';
import campusRoutes from './routes/campus.routes.js';
import buildingRoutes from './routes/building.routes.js';
import eventRoutes from './routes/event.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import auditRoutes from './routes/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow all local dev origins or matching CORS origin
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
    })
  );

  app.use(express.json());

  // Health check
  app.get('/api/v1/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      institution: 'Royal University of Phnom Penh (RUPP) Pilot',
      timestamp: new Date().toISOString(),
      platform: 'CampusConnect Multi-University System',
    });
  });

  // REST API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/universities', universityRoutes);
  app.use('/api/v1/campuses', campusRoutes);
  app.use('/api/v1/buildings', buildingRoutes);
  app.use('/api/v1/events', eventRoutes);
  app.use('/api/v1/dashboards', dashboardRoutes);
  app.use('/api/v1/audit-logs', auditRoutes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[ServerError]', err);
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  });

  return app;
}

export default createApp;
