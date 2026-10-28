import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

const campusSchema = z.object({
  universityId: z.number().int().positive(),
  slug: z.string().min(2).max(100),
  nameEn: z.string().min(2).max(255),
  nameKm: z.string().min(2).max(255),
  addressEn: z.string().min(2).max(255),
  addressKm: z.string().min(2).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isMain: z.boolean().default(false),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string().default('openstreetmap'),
  verificationStatus: z.enum(['verified', 'unverified']).default('verified'),
});

// List campuses (can filter by university_id)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { university_id } = req.query;

  let sql = `
    SELECT c.*, u.name_en AS university_name_en, u.name_km AS university_name_km, u.acronym AS university_acronym,
           COUNT(b.id) AS buildings_count
    FROM campuses c
    JOIN universities u ON c.university_id = u.id
    LEFT JOIN buildings b ON c.id = b.campus_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (university_id) {
    sql += ` AND c.university_id = ?`;
    params.push(parseInt(university_id as string, 10));
  }

  sql += ` GROUP BY c.id ORDER BY c.is_main DESC, c.id ASC`;

  const campuses = await query(sql, params);
  res.json({ success: true, data: campuses });
});

// Get single campus by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: 'Invalid campus ID' });
    return;
  }

  const campuses: any[] = await query(
    `SELECT c.*, u.name_en AS university_name_en, u.name_km AS university_name_km, u.acronym AS university_acronym
     FROM campuses c
     JOIN universities u ON c.university_id = u.id
     WHERE c.id = ?`,
    [id]
  );

  if (campuses.length === 0) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }

  // Get buildings on this campus
  const buildings = await query(
    `SELECT * FROM buildings WHERE campus_id = ? ORDER BY verification_status ASC, name_en ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...campuses[0],
      buildings,
    },
  });
});

// Create campus
router.post('/', authenticate, authorizeRole(['platform_admin', 'university_admin']), async (req: Request, res: Response): Promise<void> => {
  const parseResult = campusSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const d = parseResult.data;

  // University admin scope check
  if (req.user!.role === 'university_admin' && req.user!.university_id !== d.universityId) {
    res.status(403).json({ success: false, error: 'Cannot create a campus for another university' });
    return;
  }

  const result: any = await query(
    `INSERT INTO campuses (
       university_id, slug, name_en, name_km, address_en, address_km,
       latitude, longitude, is_main, source_url, source_type,
       verification_status, verified_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.universityId,
      d.slug,
      d.nameEn,
      d.nameKm,
      d.addressEn,
      d.addressKm,
      d.latitude,
      d.longitude,
      d.isMain,
      d.sourceUrl || null,
      d.sourceType,
      d.verificationStatus,
      d.verificationStatus === 'verified' ? new Date() : null,
    ]
  );

  const newCampusId = result.insertId;

  await logAudit({
    userId: req.user!.id,
    universityId: d.universityId,
    action: 'CAMPUS_CREATED',
    entityType: 'CAMPUS',
    entityId: newCampusId,
    details: { slug: d.slug, nameEn: d.nameEn },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    data: { id: newCampusId, ...d },
  });
});

export default router;
