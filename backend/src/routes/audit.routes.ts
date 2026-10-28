import { Router, Request, Response } from 'express';
import { query } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, authorizeRole(['platform_admin', 'university_admin']), async (req: Request, res: Response): Promise<void> => {
  const { action, entity_type, university_id } = req.query;
  const user = req.user!;

  let effectiveUniId: number | null = null;
  if (user.role === 'university_admin') {
    if (university_id && parseInt(university_id as string, 10) !== user.university_id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: University administrator cannot access audit logs of another university.',
      });
      return;
    }
    effectiveUniId = user.university_id;
  } else if (university_id) {
    effectiveUniId = parseInt(university_id as string, 10);
  }

  let sql = `
    SELECT a.*, u.email AS user_email, u.full_name AS user_name, uni.name_en AS university_name_en, uni.acronym AS university_acronym
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN universities uni ON a.university_id = uni.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (effectiveUniId) {
    sql += ` AND a.university_id = ?`;
    params.push(effectiveUniId);
  }

  if (action) {
    sql += ` AND a.action = ?`;
    params.push(action);
  }

  if (entity_type) {
    sql += ` AND a.entity_type = ?`;
    params.push(entity_type);
  }

  sql += ` ORDER BY a.created_at DESC LIMIT 100`;

  const logs = await query(sql, params);
  res.json({ success: true, count: logs.length, data: logs });
});

export default router;
