import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';

const router = Router();

// 1. Student Dashboard
router.get('/student', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;

  // Registered events
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

  // Favorited events
  const favorites = await query(
    `SELECT ef.id AS favorite_id, ef.created_at AS favorited_at,
            e.id AS event_id, e.slug, e.title_en, e.title_km, e.category, e.start_time, e.end_time,
            e.capacity, e.registered_count,
            c.name_en AS campus_name_en, b.name_en AS building_name_en
     FROM event_favorites ef
     JOIN events e ON ef.event_id = e.id
     JOIN campuses c ON e.campus_id = c.id
     LEFT JOIN buildings b ON e.building_id = b.id
     WHERE ef.user_id = ?
     ORDER BY ef.created_at DESC`,
    [userId]
  );

  // Notifications
  const notifications = await query(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 15`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      registrations,
      favorites,
      notifications,
    },
  });
});

// 2. Organizer Dashboard
router.get('/organizer', authenticate, authorizeRole(['organizer', 'university_admin', 'platform_admin']), async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const isPlatformAdmin = req.user!.role === 'platform_admin';
  const universityId = req.user!.university_id;

  let eventsSql = `
    SELECT e.*,
           c.name_en AS campus_name_en,
           b.name_en AS building_name_en,
           (e.capacity - e.registered_count) AS seats_remaining,
           ROUND((e.registered_count / e.capacity) * 100, 1) AS fill_percentage
    FROM events e
    JOIN campuses c ON e.campus_id = c.id
    LEFT JOIN buildings b ON e.building_id = b.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (!isPlatformAdmin) {
    if (req.user!.role === 'organizer') {
      eventsSql += ` AND e.organizer_id = ?`;
      params.push(userId);
    } else {
      eventsSql += ` AND e.university_id = ?`;
      params.push(universityId);
    }
  }

  eventsSql += ` ORDER BY e.start_time DESC`;

  const events = await query(eventsSql, params);

  // Summary counts
  const totalEvents = events.length;
  const activeEvents = events.filter((e: any) => e.status === 'published' && new Date(e.end_time) >= new Date()).length;
  const totalRegistrations = events.reduce((sum: number, e: any) => sum + (e.registered_count || 0), 0);

  res.json({
    success: true,
    data: {
      metrics: {
        totalEvents,
        activeEvents,
        totalRegistrations,
      },
      events,
    },
  });
});

// 3. Admin Dashboard (Acceptance Test 10: Cross-university isolation check)
router.get('/admin', authenticate, authorizeRole(['university_admin', 'platform_admin']), async (req: Request, res: Response): Promise<void> => {
  const { target_university_id } = req.query;
  const user = req.user!;

  let effectiveUniversityId: number | null = null;

  if (user.role === 'university_admin') {
    // If university admin passes another target_university_id, strictly reject (Acceptance Test 10)
    if (target_university_id && parseInt(target_university_id as string, 10) !== user.university_id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: University administrator cannot access restricted records belonging to another university.',
      });
      return;
    }
    effectiveUniversityId = user.university_id;
  } else if (user.role === 'platform_admin') {
    effectiveUniversityId = target_university_id ? parseInt(target_university_id as string, 10) : null;
  }

  // Build metrics
  let uniFilter = effectiveUniversityId ? 'WHERE u.id = ?' : '';
  let campusFilter = effectiveUniversityId ? 'WHERE university_id = ?' : '';
  let eventFilter = effectiveUniversityId ? 'WHERE university_id = ?' : '';
  let buildingFilter = effectiveUniversityId ? 'WHERE c.university_id = ?' : '';
  let auditFilter = effectiveUniversityId ? 'WHERE a.university_id = ?' : '';

  const uniParams = effectiveUniversityId ? [effectiveUniversityId] : [];

  const [uniCount]: any = await query(`SELECT COUNT(*) AS count FROM universities u ${uniFilter}`, uniParams);
  const [campusCount]: any = await query(`SELECT COUNT(*) AS count FROM campuses ${campusFilter}`, uniParams);
  const [eventCount]: any = await query(`SELECT COUNT(*) AS count FROM events ${eventFilter}`, uniParams);
  
  const buildingsStats: any[] = await query(
    `SELECT b.verification_status, COUNT(b.id) AS count
     FROM buildings b
     JOIN campuses c ON b.campus_id = c.id
     ${buildingFilter}
     GROUP BY b.verification_status`,
    uniParams
  );

  const [regCount]: any = await query(
    `SELECT COUNT(er.id) AS total_registrations
     FROM event_registrations er
     JOIN events e ON er.event_id = e.id
     ${eventFilter}`,
    uniParams
  );

  // Recent audit logs
  const auditLogs = await query(
    `SELECT a.*, u.email AS user_email, u.full_name AS user_name, uni.acronym AS university_acronym
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN universities uni ON a.university_id = uni.id
     ${auditFilter}
     ORDER BY a.created_at DESC
     LIMIT 20`,
    uniParams
  );

  res.json({
    success: true,
    data: {
      scope: effectiveUniversityId ? `University #${effectiveUniversityId}` : 'Global Platform',
      metrics: {
        universities: uniCount.count,
        campuses: campusCount.count,
        events: eventCount.count,
        totalRegistrations: regCount.total_registrations,
        buildingsVerified: buildingsStats.find((s: any) => s.verification_status === 'verified')?.count || 0,
        buildingsUnverified: buildingsStats.find((s: any) => s.verification_status === 'unverified')?.count || 0,
      },
      auditLogs,
    },
  });
});

export default router;
