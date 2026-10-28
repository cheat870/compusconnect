import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

const universitySchema = z.object({
  slug: z.string().min(2).max(100),
  nameEn: z.string().min(2).max(255),
  nameKm: z.string().min(2).max(255),
  acronym: z.string().min(2).max(50),
  officialWebsite: z.string().url(),
  logoUrl: z.string().optional(),
  descriptionEn: z.string().optional(),
  descriptionKm: z.string().optional(),
  addressEn: z.string().optional(),
  addressKm: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  sourceUrl: z.string().url(),
  sourceType: z.enum(['official_website', 'ministry_registry', 'authorized_entry', 'public_directory']).default('official_website'),
  verificationStatus: z.enum(['verified', 'unverified', 'pending_review']).default('verified'),
  dataClassification: z.enum(['verified_public', 'unverified', 'demonstration']).default('verified_public'),
});

// List all universities
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { search, classification } = req.query;

  let sql = `
    SELECT u.*,
           COUNT(DISTINCT c.id) AS campuses_count,
           COUNT(DISTINCT b.id) AS buildings_count,
           COUNT(DISTINCT e.id) AS events_count
    FROM universities u
    LEFT JOIN campuses c ON u.id = c.university_id
    LEFT JOIN buildings b ON c.id = b.campus_id
    LEFT JOIN events e ON u.id = e.university_id AND e.status = 'published'
    WHERE u.is_active = TRUE
  `;
  const params: any[] = [];

  if (search) {
    sql += ` AND (u.name_en LIKE ? OR u.name_km LIKE ? OR u.acronym LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (classification && classification !== 'all') {
    sql += ` AND u.data_classification = ?`;
    params.push(classification);
  }

  sql += ` GROUP BY u.id ORDER BY u.id ASC`;

  const universities = await query(sql, params);
  res.json({ success: true, data: universities });
});

// Get single university by ID or Slug
router.get('/:idOrSlug', async (req: Request, res: Response): Promise<void> => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);

  const sql = `
    SELECT u.*
    FROM universities u
    WHERE ${isNumeric ? 'u.id = ?' : 'u.slug = ?'} AND u.is_active = TRUE
  `;

  const universities: any[] = await query(sql, [isNumeric ? parseInt(idOrSlug, 10) : idOrSlug]);
  if (universities.length === 0) {
    res.status(404).json({ success: false, error: 'University not found' });
    return;
  }

  const university = universities[0];

  // Fetch campuses
  const campuses = await query(
    `SELECT c.*, COUNT(b.id) AS buildings_count
     FROM campuses c
     LEFT JOIN buildings b ON c.id = b.campus_id
     WHERE c.university_id = ?
     GROUP BY c.id
     ORDER BY c.is_main DESC, c.id ASC`,
    [university.id]
  );

  res.json({
    success: true,
    data: {
      ...university,
      campuses,
    },
  });
});

// Create a new university (Acceptance Test 2: Another university can be added without changing schema)
router.post('/', authenticate, authorizeRole(['platform_admin']), async (req: Request, res: Response): Promise<void> => {
  const parseResult = universitySchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const d = parseResult.data;

  // Check unique slug
  const existing = await query('SELECT id FROM universities WHERE slug = ?', [d.slug]);
  if (existing.length > 0) {
    res.status(409).json({ success: false, error: 'University slug already exists' });
    return;
  }

  const result: any = await query(
    `INSERT INTO universities (
       slug, name_en, name_km, acronym, official_website,
       logo_url, description_en, description_km, address_en, address_km,
       phone, email, is_active, source_url, source_type,
       verification_status, data_classification, verified_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?)`,
    [
      d.slug,
      d.nameEn,
      d.nameKm,
      d.acronym,
      d.officialWebsite,
      d.logoUrl || null,
      d.descriptionEn || null,
      d.descriptionKm || null,
      d.addressEn || null,
      d.addressKm || null,
      d.phone || null,
      d.email || null,
      d.sourceUrl,
      d.sourceType,
      d.verificationStatus,
      d.dataClassification,
      d.verificationStatus === 'verified' ? new Date() : null,
    ]
  );

  const newUniId = result.insertId;

  await logAudit({
    userId: req.user!.id,
    universityId: newUniId,
    action: 'UNIVERSITY_CREATED',
    entityType: 'UNIVERSITY',
    entityId: newUniId,
    details: { slug: d.slug, nameEn: d.nameEn, acronym: d.acronym },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    data: {
      id: newUniId,
      slug: d.slug,
      nameEn: d.nameEn,
      nameKm: d.nameKm,
      acronym: d.acronym,
      verificationStatus: d.verificationStatus,
      dataClassification: d.dataClassification,
    },
  });
});

export default router;
