import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

const updateCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sourceUrl: z.string().url(),
  sourceType: z.string().default('openstreetmap'),
  verificationStatus: z.enum(['verified', 'unverified', 'pending_review']).default('verified'),
  reason: z.string().optional(),
});

const buildingSchema = z.object({
  campusId: z.number().int().positive(),
  code: z.string().optional(),
  nameEn: z.string().min(2).max(255),
  nameKm: z.string().min(2).max(255),
  category: z.enum(['academic', 'administrative', 'library', 'cooperation_center', 'lab', 'sports', 'canteen', 'other']).default('academic'),
  descriptionEn: z.string().optional(),
  descriptionKm: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  floors: z.number().int().min(1).default(1),
  isAccessible: z.boolean().default(true),
  sourceUrl: z.string().url(),
  sourceType: z.string().default('openstreetmap'),
  verificationStatus: z.enum(['verified', 'unverified', 'pending_review']).default('verified'),
  dataClassification: z.enum(['verified_public', 'unverified', 'demonstration']).default('verified_public'),
});

// List buildings
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { campus_id, category, verification_status, search } = req.query;

  let sql = `
    SELECT b.*, c.name_en AS campus_name_en, c.name_km AS campus_name_km, c.university_id,
           u.name_en AS university_name_en, u.acronym AS university_acronym
    FROM buildings b
    JOIN campuses c ON b.campus_id = c.id
    JOIN universities u ON c.university_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (campus_id) {
    sql += ` AND b.campus_id = ?`;
    params.push(parseInt(campus_id as string, 10));
  }

  if (category) {
    sql += ` AND b.category = ?`;
    params.push(category);
  }

  if (verification_status) {
    sql += ` AND b.verification_status = ?`;
    params.push(verification_status);
  }

  if (search) {
    sql += ` AND (b.name_en LIKE ? OR b.name_km LIKE ? OR b.code LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY b.verification_status ASC, b.name_en ASC`;

  const buildings = await query(sql, params);
  res.json({ success: true, data: buildings });
});

// Get building by ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: 'Invalid building ID' });
    return;
  }

  const buildings: any[] = await query(
    `SELECT b.*, c.name_en AS campus_name_en, c.name_km AS campus_name_km, c.university_id,
            u.name_en AS university_name_en, u.name_km AS university_name_km, u.acronym AS university_acronym,
            v.full_name AS verifier_name
     FROM buildings b
     JOIN campuses c ON b.campus_id = c.id
     JOIN universities u ON c.university_id = u.id
     LEFT JOIN users v ON b.last_verified_by = v.id
     WHERE b.id = ?`,
    [id]
  );

  if (buildings.length === 0) {
    res.status(404).json({ success: false, error: 'Building not found' });
    return;
  }

  // Also fetch upcoming events hosted in this building
  const upcomingEvents = await query(
    `SELECT id, slug, title_en, title_km, start_time, end_time, category, event_verification
     FROM events
     WHERE building_id = ? AND status = 'published' AND start_time >= NOW()
     ORDER BY start_time ASC`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...buildings[0],
      upcomingEvents,
    },
  });
});

// Update building coordinates (Authorized Administrators)
router.put('/:id/coordinates', authenticate, authorizeRole(['platform_admin', 'university_admin']), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: 'Invalid building ID' });
    return;
  }

  const parseResult = updateCoordinatesSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { latitude, longitude, sourceUrl, sourceType, verificationStatus, reason } = parseResult.data;

  // Check building exists and check scope
  const buildings: any[] = await query(
    `SELECT b.*, c.university_id FROM buildings b JOIN campuses c ON b.campus_id = c.id WHERE b.id = ?`,
    [id]
  );

  if (buildings.length === 0) {
    res.status(404).json({ success: false, error: 'Building not found' });
    return;
  }

  const building = buildings[0];

  if (req.user!.role === 'university_admin' && req.user!.university_id !== building.university_id) {
    res.status(403).json({ success: false, error: 'Cannot update building belonging to another university' });
    return;
  }

  const oldCoords = { lat: building.latitude, lng: building.longitude, status: building.verification_status };

  await query(
    `UPDATE buildings
     SET latitude = ?,
         longitude = ?,
         source_url = ?,
         source_type = ?,
         verification_status = ?,
         verified_at = ?,
         last_verified_by = ?
     WHERE id = ?`,
    [
      latitude,
      longitude,
      sourceUrl,
      sourceType,
      verificationStatus,
      verificationStatus === 'verified' ? new Date() : null,
      req.user!.id,
      id,
    ]
  );

  await logAudit({
    userId: req.user!.id,
    universityId: building.university_id,
    action: 'BUILDING_COORDINATES_UPDATED',
    entityType: 'BUILDING',
    entityId: id,
    details: {
      buildingName: building.name_en,
      oldCoordinates: oldCoords,
      newCoordinates: { lat: latitude, lng: longitude, status: verificationStatus },
      sourceUrl,
      reason: reason || 'GPS coordinate correction by administrator',
    },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'Building coordinates successfully updated and verified.',
    data: {
      id,
      latitude,
      longitude,
      sourceUrl,
      verificationStatus,
    },
  });
});

// Create building
router.post('/', authenticate, authorizeRole(['platform_admin', 'university_admin']), async (req: Request, res: Response): Promise<void> => {
  const parseResult = buildingSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const d = parseResult.data;

  // Check campus and university scope
  const campuses: any[] = await query('SELECT university_id FROM campuses WHERE id = ?', [d.campusId]);
  if (campuses.length === 0) {
    res.status(404).json({ success: false, error: 'Campus not found' });
    return;
  }

  const campus = campuses[0];
  if (req.user!.role === 'university_admin' && req.user!.university_id !== campus.university_id) {
    res.status(403).json({ success: false, error: 'Cannot add building to another university' });
    return;
  }

  const result: any = await query(
    `INSERT INTO buildings (
       campus_id, code, name_en, name_km, category,
       description_en, description_km, latitude, longitude,
       floors, is_accessible, source_url, source_type,
       verification_status, data_classification, verified_at, last_verified_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.campusId,
      d.code || null,
      d.nameEn,
      d.nameKm,
      d.category,
      d.descriptionEn || null,
      d.descriptionKm || null,
      d.latitude,
      d.longitude,
      d.floors,
      d.isAccessible,
      d.sourceUrl,
      d.sourceType,
      d.verificationStatus,
      d.dataClassification,
      d.verificationStatus === 'verified' ? new Date() : null,
      req.user!.id,
    ]
  );

  const newBuildingId = result.insertId;

  await logAudit({
    userId: req.user!.id,
    universityId: campus.university_id,
    action: 'BUILDING_CREATED',
    entityType: 'BUILDING',
    entityId: newBuildingId,
    details: { nameEn: d.nameEn, campusId: d.campusId },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    data: { id: newBuildingId, ...d },
  });
});

export default router;
