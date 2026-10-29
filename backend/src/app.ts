import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { authenticate } from './middlewares/auth.js';
import { query } from './database/connection.js';

import authRoutes from './routes/auth.routes.js';
import universityRoutes from './routes/university.routes.js';
import campusRoutes from './routes/campus.routes.js';
import buildingRoutes from './routes/building.routes.js';
import eventRoutes from './routes/event.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import auditRoutes from './routes/audit.routes.js';

export function createApp(): Express {
  const app = express();

  // Helmet Security Headers (Specification Section 10)
  app.use(
    helmet({
      contentSecurityPolicy: false, // allow map tiles and external font loads
      crossOriginEmbedderPolicy: false,
    })
  );

  // Rate Limiting on Authentication Endpoints (Specification Section 6 & 10)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // max 100 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many authentication attempts, please try again later.' },
  });

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // allow local dev origins
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
      version: '2.0.0',
      institution: 'Royal University of Phnom Penh (RUPP) Pilot',
      timestamp: new Date().toISOString(),
      platform: 'CampusConnect Multi-University System v2.0',
    });
  });

  // Dedicated My Registrations endpoint (Specification Section 9: GET /api/v1/me/registrations)
  app.get('/api/v1/me/registrations', authenticate, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const registrations = await query(
      `SELECT er.id AS registration_id, er.status AS registration_status, er.registered_at,
              e.id AS event_id, e.slug, e.title_en, e.title_km, e.category, e.start_time, e.end_time,
              e.room_or_venue_details, e.status AS event_status, e.event_verification,
              u.name_en AS university_name_en, u.name_km AS university_name_km, u.acronym AS university_acronym,
              c.name_en AS campus_name_en, c.name_km AS campus_name_km,
              b.name_en AS building_name_en, b.name_km AS building_name_km, b.latitude, b.longitude
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       JOIN universities u ON e.university_id = u.id
       JOIN campuses c ON e.campus_id = c.id
       LEFT JOIN buildings b ON e.building_id = b.id
       WHERE er.user_id = ?
       ORDER BY e.start_time ASC`,
      [userId]
    );
    res.json({ success: true, count: registrations.length, data: registrations });
  });

  // REST API Routes
  app.use('/api/v1/auth', authLimiter, authRoutes);
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
