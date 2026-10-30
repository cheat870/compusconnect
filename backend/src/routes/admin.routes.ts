import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

// Restrict all /admin routes to platform_admin or university_admin
router.use(authenticate);
router.use(authorizeRole(['platform_admin', 'university_admin']));

/**
 * 1. GET /api/v1/admin/dashboard
 * Real database statistics and recent administrative actions
 */
router.get('/dashboard', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const isPlatformAdmin = user.role === 'platform_admin';
  const effectiveUniId = isPlatformAdmin
    ? (req.query.target_university_id ? parseInt(req.query.target_university_id as string, 10) : null)
    : user.university_id;

  // Strict cross-university isolation
  if (!isPlatformAdmin && req.query.target_university_id) {
    const requestedId = parseInt(req.query.target_university_id as string, 10);
    if (requestedId !== user.university_id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: University administrator cannot access statistics belonging to another university.',
      });
      return;
    }
  }

  const uniParam = effectiveUniId ? [effectiveUniId] : [];
  const uniFilter = effectiveUniId ? 'WHERE university_id = ?' : '';
  const userUniFilter = effectiveUniId ? 'WHERE u.university_id = ?' : '';
  const buildingFilter = effectiveUniId ? 'WHERE c.university_id = ?' : '';
  const eventFilter = effectiveUniId ? 'WHERE e.university_id = ?' : '';
  const auditFilter = effectiveUniId ? 'WHERE a.university_id = ?' : '';

  // 1. Total & Active Users
  const [userStats]: any = await query(
    `SELECT COUNT(u.id) AS total_users,
            SUM(CASE WHEN u.is_active = TRUE THEN 1 ELSE 0 END) AS active_users,
            SUM(CASE WHEN u.last_login_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS monthly_active_users
     FROM users u ${userUniFilter}`,
    uniParam
  );

  // 2. Events & Pending Approvals
  const [eventStats]: any = await query(
    `SELECT COUNT(e.id) AS total_events,
            SUM(CASE WHEN e.status = 'published' AND e.approval_status = 'approved' THEN 1 ELSE 0 END) AS published_events,
            SUM(CASE WHEN e.approval_status = 'pending' THEN 1 ELSE 0 END) AS pending_approvals
     FROM events e ${eventFilter}`,
    uniParam
  );

  // 3. Buildings & Verification
  const [buildingStats]: any = await query(
    `SELECT COUNT(b.id) AS total_buildings,
            SUM(CASE WHEN b.verification_status = 'verified' THEN 1 ELSE 0 END) AS verified_buildings,
            SUM(CASE WHEN b.verification_status = 'unverified' THEN 1 ELSE 0 END) AS unverified_buildings
     FROM buildings b
     JOIN campuses c ON b.campus_id = c.id
     ${buildingFilter}`,
    uniParam
  );

  // 4. Registrations Count
  const [regStats]: any = await query(
    `SELECT COUNT(er.id) AS total_registrations
     FROM event_registrations er
     JOIN events e ON er.event_id = e.id
     ${eventFilter}`,
    uniParam
  );

  // 5. Recent Audit Logs
  const recentActions = await query(
    `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.created_at,
            u.full_name AS user_name, u.email AS user_email, u.role AS user_role,
            uni.acronym AS university_acronym
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN universities uni ON a.university_id = uni.id
     ${auditFilter}
     ORDER BY a.created_at DESC
     LIMIT 10`,
    uniParam
  );

  res.json({
    success: true,
    data: {
      scope: effectiveUniId ? `University #${effectiveUniId}` : 'Global Platform',
      metrics: {
        totalUsers: Number(userStats?.total_users || 0),
        activeUsers: Number(userStats?.active_users || 0),
        monthlyActiveUsers: Number(userStats?.monthly_active_users || 0),
        totalEvents: Number(eventStats?.total_events || 0),
        publishedEvents: Number(eventStats?.published_events || 0),
        pendingApprovals: Number(eventStats?.pending_approvals || 0),
        totalBuildings: Number(buildingStats?.total_buildings || 0),
        verifiedBuildings: Number(buildingStats?.verified_buildings || 0),
        unverifiedBuildings: Number(buildingStats?.unverified_buildings || 0),
        totalRegistrations: Number(regStats?.total_registrations || 0),
      },
      recentActions,
    },
  });
});

/**
 * 2. GET /api/v1/admin/users
 * Paginated user directory with search and role filtering
 */
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const isPlatformAdmin = user.role === 'platform_admin';

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const offset = (page - 1) * limit;

  const search = req.query.search as string;
  const role = req.query.role as string;
  const targetUniId = isPlatformAdmin
    ? (req.query.university_id ? parseInt(req.query.university_id as string, 10) : null)
    : user.university_id;

  let whereSql = 'WHERE 1=1';
  const params: any[] = [];

  if (targetUniId) {
    whereSql += ' AND u.university_id = ?';
    params.push(targetUniId);
  }

  if (role) {
    whereSql += ' AND u.role = ?';
    params.push(role);
  }

  if (search) {
    whereSql += ' AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult]: any = await query(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
  const total = countResult.total;

  const users = await query(
    `SELECT u.id, u.email, u.full_name, u.full_name_km, u.role, u.university_id, u.phone,
            u.is_active, u.last_login_at, u.created_at,
            un.name_en AS university_name_en, un.acronym AS university_acronym
     FROM users u
     LEFT JOIN universities un ON u.university_id = un.id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * 3. PATCH /api/v1/admin/users/:id/role
 * Change a user's role (enforcing RBAC and audit trail)
 */
router.patch('/users/:id/role', async (req: Request, res: Response): Promise<void> => {
  const targetUserId = parseInt(req.params.id, 10);
  const { role } = req.body;
  const validRoles = ['platform_admin', 'university_admin', 'organizer', 'student'];

  if (!validRoles.includes(role)) {
    res.status(400).json({ success: false, error: `Invalid role. Allowed roles: [${validRoles.join(', ')}]` });
    return;
  }

  const targetUsers: any[] = await query('SELECT * FROM users WHERE id = ?', [targetUserId]);
  if (targetUsers.length === 0) {
    res.status(404).json({ success: false, error: 'Target user not found' });
    return;
  }

  const targetUser = targetUsers[0];
  const currentUser = req.user!;

  // Tenant and privilege scoping
  if (currentUser.role !== 'platform_admin') {
    // University Admin can only manage users of their own university
    if (targetUser.university_id !== currentUser.university_id) {
      res.status(403).json({ success: false, error: 'Forbidden: Cannot change roles for users belonging to another university' });
      return;
    }
    // University Admin cannot promote someone to Platform Admin
    if (role === 'platform_admin') {
      res.status(403).json({ success: false, error: 'Forbidden: Only Platform Administrators can assign the Platform Admin role' });
      return;
    }
  }

  // Prevent demoting the last active platform admin
  if (targetUser.role === 'platform_admin' && role !== 'platform_admin') {
    const [adminCount]: any = await query("SELECT COUNT(*) AS count FROM users WHERE role = 'platform_admin' AND is_active = TRUE");
    if (adminCount.count <= 1) {
      res.status(400).json({ success: false, error: 'Cannot demote the last remaining Platform Administrator' });
      return;
    }
  }

  await query('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);

  await logAudit({
    userId: currentUser.id,
    universityId: targetUser.university_id,
    action: 'USER_ROLE_CHANGED',
    entityType: 'USER',
    entityId: targetUserId,
    details: { previousRole: targetUser.role, newRole: role, targetEmail: targetUser.email },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: `User role updated successfully to '${role}'`,
    data: { id: targetUserId, email: targetUser.email, role },
  });
});

/**
 * 4. PATCH /api/v1/admin/users/:id/status
 * Activate or deactivate a user account
 */
router.patch('/users/:id/status', async (req: Request, res: Response): Promise<void> => {
  const targetUserId = parseInt(req.params.id, 10);
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    res.status(400).json({ success: false, error: 'isActive must be a boolean' });
    return;
  }

  const targetUsers: any[] = await query('SELECT * FROM users WHERE id = ?', [targetUserId]);
  if (targetUsers.length === 0) {
    res.status(404).json({ success: false, error: 'Target user not found' });
    return;
  }

  const targetUser = targetUsers[0];
  const currentUser = req.user!;

  if (currentUser.role !== 'platform_admin' && targetUser.university_id !== currentUser.university_id) {
    res.status(403).json({ success: false, error: 'Forbidden: Cannot change status for users of another university' });
    return;
  }

  // Prevent deactivating own account if last platform admin
  if (targetUser.id === currentUser.id && !isActive) {
    res.status(400).json({ success: false, error: 'Cannot deactivate your own active administrator account' });
    return;
  }

  await query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, targetUserId]);
  if (!isActive) {
    // Invalidate sessions immediately upon deactivation
    await query('UPDATE user_sessions SET is_valid = FALSE WHERE user_id = ?', [targetUserId]);
  }

  await logAudit({
    userId: currentUser.id,
    universityId: targetUser.university_id,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'USER',
    entityId: targetUserId,
    details: { targetEmail: targetUser.email, isActive },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: `User account has been ${isActive ? 'activated' : 'deactivated'}`,
  });
});

/**
 * 5. GET /api/v1/admin/events
 * Admin event directory with search, filtering, and approval status
 */
router.get('/events', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const isPlatformAdmin = user.role === 'platform_admin';

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
  const offset = (page - 1) * limit;

  const search = req.query.search as string;
  const approvalStatus = req.query.approval_status as string;
  const targetUniId = isPlatformAdmin
    ? (req.query.university_id ? parseInt(req.query.university_id as string, 10) : null)
    : user.university_id;

  let whereSql = 'WHERE 1=1';
  const params: any[] = [];

  if (targetUniId) {
    whereSql += ' AND e.university_id = ?';
    params.push(targetUniId);
  }

  if (approvalStatus) {
    whereSql += ' AND e.approval_status = ?';
    params.push(approvalStatus);
  }

  if (search) {
    whereSql += ' AND (e.title_en LIKE ? OR e.title_km LIKE ? OR e.room_or_venue_details LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult]: any = await query(`SELECT COUNT(*) AS total FROM events e ${whereSql}`, params);
  const total = countResult.total;

  const events = await query(
    `SELECT e.*,
            u.name_en AS university_name_en, u.acronym AS university_acronym,
            c.name_en AS campus_name_en, b.name_en AS building_name_en,
            org.full_name AS organizer_name, org.email AS organizer_email
     FROM events e
     JOIN universities u ON e.university_id = u.id
     JOIN campuses c ON e.campus_id = c.id
     LEFT JOIN buildings b ON e.building_id = b.id
     JOIN users org ON e.organizer_id = org.id
     ${whereSql}
     ORDER BY e.start_time DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: events,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * 6. POST /api/v1/admin/events/:id/approve
 */
router.post('/events/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  const events: any[] = await query('SELECT * FROM events WHERE id = ?', [eventId]);
  if (events.length === 0) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  const event = events[0];
  const currentUser = req.user!;

  if (currentUser.role !== 'platform_admin' && event.university_id !== currentUser.university_id) {
    res.status(403).json({ success: false, error: 'Forbidden: Cannot approve events belonging to another university' });
    return;
  }

  await query('UPDATE events SET approval_status = "approved", rejection_reason = NULL WHERE id = ?', [eventId]);

  await logAudit({
    userId: currentUser.id,
    universityId: event.university_id,
    action: 'EVENT_APPROVED',
    entityType: 'EVENT',
    entityId: eventId,
    details: { eventTitle: event.title_en },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Event successfully approved and published' });
});

/**
 * 7. POST /api/v1/admin/events/:id/reject
 */
router.post('/events/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  const { rejectionReason } = req.body;

  if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
    res.status(400).json({ success: false, error: 'Rejection reason is mandatory when rejecting an event' });
    return;
  }

  const events: any[] = await query('SELECT * FROM events WHERE id = ?', [eventId]);
  if (events.length === 0) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  const event = events[0];
  const currentUser = req.user!;

  if (currentUser.role !== 'platform_admin' && event.university_id !== currentUser.university_id) {
    res.status(403).json({ success: false, error: 'Forbidden: Cannot reject events belonging to another university' });
    return;
  }

  await query('UPDATE events SET approval_status = "rejected", rejection_reason = ? WHERE id = ?', [rejectionReason.trim(), eventId]);

  await logAudit({
    userId: currentUser.id,
    universityId: event.university_id,
    action: 'EVENT_REJECTED',
    entityType: 'EVENT',
    entityId: eventId,
    details: { eventTitle: event.title_en, rejectionReason: rejectionReason.trim() },
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Event has been rejected' });
});

/**
 * 8. GET /api/v1/admin/audit-logs
 * Immutable audit log trail with pagination and filtering
 */
router.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const isPlatformAdmin = user.role === 'platform_admin';

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
  const offset = (page - 1) * limit;

  const action = req.query.action as string;
  const entityType = req.query.entity_type as string;
  const targetUniId = isPlatformAdmin
    ? (req.query.university_id ? parseInt(req.query.university_id as string, 10) : null)
    : user.university_id;

  let whereSql = 'WHERE 1=1';
  const params: any[] = [];

  if (targetUniId) {
    whereSql += ' AND a.university_id = ?';
    params.push(targetUniId);
  }

  if (action) {
    whereSql += ' AND a.action = ?';
    params.push(action);
  }

  if (entityType) {
    whereSql += ' AND a.entity_type = ?';
    params.push(entityType);
  }

  const [countResult]: any = await query(`SELECT COUNT(*) AS total FROM audit_logs a ${whereSql}`, params);
  const total = countResult.total;

  const logs = await query(
    `SELECT a.id, a.user_id, a.university_id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
            u.full_name AS user_name, u.email AS user_email, u.role AS user_role,
            uni.acronym AS university_acronym
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     LEFT JOIN universities uni ON a.university_id = uni.id
     ${whereSql}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * 9. GET /api/v1/admin/registrations
 * Student event registrations overview
 */
router.get('/registrations', async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  const isPlatformAdmin = user.role === 'platform_admin';

  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
  const offset = (page - 1) * limit;

  const targetUniId = isPlatformAdmin
    ? (req.query.university_id ? parseInt(req.query.university_id as string, 10) : null)
    : user.university_id;

  let whereSql = 'WHERE 1=1';
  const params: any[] = [];

  if (targetUniId) {
    whereSql += ' AND e.university_id = ?';
    params.push(targetUniId);
  }

  const [countResult]: any = await query(
    `SELECT COUNT(er.id) AS total
     FROM event_registrations er
     JOIN events e ON er.event_id = e.id
     ${whereSql}`,
    params
  );
  const total = countResult.total;

  const registrations = await query(
    `SELECT er.id AS registration_id, er.status, er.registered_at,
            e.id AS event_id, e.title_en AS event_title_en, e.title_km AS event_title_km,
            e.start_time, e.capacity,
            u.id AS student_id, u.full_name AS student_name, u.email AS student_email, u.phone AS student_phone,
            uni.acronym AS university_acronym
     FROM event_registrations er
     JOIN events e ON er.event_id = e.id
     JOIN users u ON er.user_id = u.id
     JOIN universities uni ON e.university_id = uni.id
     ${whereSql}
     ORDER BY er.registered_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  res.json({
    success: true,
    data: registrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default router;
