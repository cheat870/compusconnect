import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../database/connection.js';
import { authenticate, authorizeRole } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

const createEventSchema = z.object({
  universityId: z.number().int().positive(),
  campusId: z.number().int().positive(),
  buildingId: z.number().int().positive().nullable().optional(),
  slug: z.string().min(2).max(150),
  titleEn: z.string().min(2).max(255),
  titleKm: z.string().min(2).max(255),
  category: z.enum(['academic', 'career_fair', 'cultural', 'technology', 'sports', 'workshop', 'orientation', 'other']).default('academic'),
  descriptionEn: z.string().min(10),
  descriptionKm: z.string().min(10),
  roomOrVenueDetails: z.string().optional(),
  startTime: z.string(), // ISO datetime or YYYY-MM-DD HH:mm:ss
  endTime: z.string(),
  registrationDeadline: z.string().optional(),
  capacity: z.number().int().positive().default(50),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).default('published'),
  eventVerification: z.enum(['confirmed', 'unverified', 'draft', 'expired', 'demonstration']).default('confirmed'),
  dataClassification: z.enum(['verified_public', 'unverified', 'demonstration']).default('verified_public'),
  sourceUrl: z.string().url().optional(),
  sourceType: z.string().optional(),
  bannerImageUrl: z.string().optional(),
});

// 1. List events
// By default only returns confirmed upcoming published events (Acceptance Test 12)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const {
    university_id,
    campus_id,
    building_id,
    category,
    search,
    include_all,
    classification,
    verification,
  } = req.query;

  let sql = `
    SELECT e.*,
           u.name_en AS university_name_en, u.name_km AS university_name_km, u.acronym AS university_acronym,
           c.name_en AS campus_name_en, c.name_km AS campus_name_km, c.slug AS campus_slug,
           b.name_en AS building_name_en, b.name_km AS building_name_km, b.code AS building_code,
           b.latitude AS building_latitude, b.longitude AS building_longitude,
           b.verification_status AS building_verification_status,
           org.full_name AS organizer_name
    FROM events e
    JOIN universities u ON e.university_id = u.id
    JOIN campuses c ON e.campus_id = c.id
    LEFT JOIN buildings b ON e.building_id = b.id
    JOIN users org ON e.organizer_id = org.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (university_id) {
    sql += ` AND e.university_id = ?`;
    params.push(parseInt(university_id as string, 10));
  }

  if (campus_id) {
    sql += ` AND e.campus_id = ?`;
    params.push(parseInt(campus_id as string, 10));
  }

  if (building_id) {
    sql += ` AND e.building_id = ?`;
    params.push(parseInt(building_id as string, 10));
  }

  if (category) {
    sql += ` AND e.category = ?`;
    params.push(category);
  }

  if (search) {
    sql += ` AND (e.title_en LIKE ? OR e.title_km LIKE ? OR e.description_en LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Strict verification filter: Unless explicitly asking for all or a specific classification
  if (include_all === 'true') {
    // Show all including drafts/expired/demo for management view
  } else {
    // PUBLIC VIEW: Only published, verified upcoming events
    if (verification) {
      sql += ` AND e.event_verification = ?`;
      params.push(verification);
    } else {
      sql += ` AND e.status = 'published' AND e.event_verification = 'confirmed' AND e.end_time >= NOW()`;
    }

    if (classification && classification !== 'all') {
      sql += ` AND e.data_classification = ?`;
      params.push(classification);
    }
  }

  sql += ` ORDER BY e.start_time ASC`;

  const events = await query(sql, params);
  res.json({ success: true, count: events.length, data: events });
});

// 2. Get single event by ID or Slug (Acceptance Test 4 & 5)
router.get('/:idOrSlug', async (req: Request, res: Response): Promise<void> => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);

  const sql = `
    SELECT e.*,
           u.name_en AS university_name_en, u.name_km AS university_name_km, u.acronym AS university_acronym,
           u.official_website AS university_website,
           c.name_en AS campus_name_en, c.name_km AS campus_name_km, c.slug AS campus_slug,
           c.latitude AS campus_latitude, c.longitude AS campus_longitude,
           b.name_en AS building_name_en, b.name_km AS building_name_km, b.code AS building_code,
           b.latitude AS building_latitude, b.longitude AS building_longitude,
           b.category AS building_category,
           b.verification_status AS building_verification_status,
           b.source_url AS building_source_url,
           org.full_name AS organizer_name, org.email AS organizer_email
    FROM events e
    JOIN universities u ON e.university_id = u.id
    JOIN campuses c ON e.campus_id = c.id
    LEFT JOIN buildings b ON e.building_id = b.id
    JOIN users org ON e.organizer_id = org.id
    WHERE ${isNumeric ? 'e.id = ?' : 'e.slug = ?'}
  `;

  const events: any[] = await query(sql, [isNumeric ? parseInt(idOrSlug, 10) : idOrSlug]);
  if (events.length === 0) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  const event = events[0];

  // Structure venue details clearly (Acceptance Test 5: Event page displays verified venue)
  const venue = {
    campusNameEn: event.campus_name_en,
    campusNameKm: event.campus_name_km,
    campusSlug: event.campus_slug,
    buildingId: event.building_id,
    buildingNameEn: event.building_name_en,
    buildingNameKm: event.building_name_km,
    buildingCode: event.building_code,
    roomDetails: event.room_or_venue_details,
    latitude: event.building_latitude || event.campus_latitude,
    longitude: event.building_longitude || event.campus_longitude,
    isVenueVerified: event.building_verification_status === 'verified',
    buildingVerificationStatus: event.building_verification_status || 'unverified',
    sourceUrl: event.building_source_url,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${event.building_latitude || event.campus_latitude},${event.building_longitude || event.campus_longitude}`,
    osmUrl: `https://www.openstreetmap.org/?mlat=${event.building_latitude || event.campus_latitude}&mlon=${event.building_longitude || event.campus_longitude}#map=18/${event.building_latitude || event.campus_latitude}/${event.building_longitude || event.campus_longitude}`,
  };

  res.json({
    success: true,
    data: {
      ...event,
      venue,
      isRegistrationOpen: event.status === 'published' && (!event.registration_deadline || new Date(event.registration_deadline) > new Date()) && event.registered_count < event.capacity,
    },
  });
});

// 3. Create Event (Organizer / Admin)
router.post('/', authenticate, authorizeRole(['platform_admin', 'university_admin', 'organizer']), async (req: Request, res: Response): Promise<void> => {
  const parseResult = createEventSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const d = parseResult.data;

  // University scope check: Organizer / Univ Admin can only create for their university
  if (req.user!.role !== 'platform_admin' && req.user!.university_id !== d.universityId) {
    res.status(403).json({ success: false, error: 'Cannot create event for another university' });
    return;
  }

  // Campus belongs to university check
  const campuses: any[] = await query('SELECT id FROM campuses WHERE id = ? AND university_id = ?', [d.campusId, d.universityId]);
  if (campuses.length === 0) {
    res.status(400).json({ success: false, error: 'Campus does not belong to the specified university' });
    return;
  }

  // Building belongs to campus check (if specified)
  if (d.buildingId) {
    const buildings: any[] = await query('SELECT id FROM buildings WHERE id = ? AND campus_id = ?', [d.buildingId, d.campusId]);
    if (buildings.length === 0) {
      res.status(400).json({ success: false, error: 'Specified building does not belong to the selected campus' });
      return;
    }
  }

  // Check unique slug
  const existing = await query('SELECT id FROM events WHERE slug = ?', [d.slug]);
  if (existing.length > 0) {
    res.status(409).json({ success: false, error: 'Event slug already exists' });
    return;
  }

  const result: any = await query(
    `INSERT INTO events (
       university_id, campus_id, building_id, organizer_id,
       slug, title_en, title_km, category,
       description_en, description_km, room_or_venue_details,
       start_time, end_time, registration_deadline,
       capacity, registered_count, status, event_verification,
       data_classification, source_url, source_type, last_verified_at, banner_image_url
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.universityId,
      d.campusId,
      d.buildingId || null,
      req.user!.id,
      d.slug,
      d.titleEn,
      d.titleKm,
      d.category,
      d.descriptionEn,
      d.descriptionKm,
      d.roomOrVenueDetails || null,
      new Date(d.startTime),
      new Date(d.endTime),
      d.registrationDeadline ? new Date(d.registrationDeadline) : null,
      d.capacity,
      d.status,
      d.eventVerification,
      d.dataClassification,
      d.sourceUrl || null,
      d.sourceType || 'manual_entry',
      d.eventVerification === 'confirmed' ? new Date() : null,
      d.bannerImageUrl || null,
    ]
  );

  const newEventId = result.insertId;

  await logAudit({
    userId: req.user!.id,
    universityId: d.universityId,
    action: 'EVENT_CREATED',
    entityType: 'EVENT',
    entityId: newEventId,
    details: { slug: d.slug, titleEn: d.titleEn },
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    data: { id: newEventId, ...d },
  });
});

// 4. Update Event (Acceptance Test 9: An unauthorized organizer cannot modify another university's event)
router.put('/:id', authenticate, authorizeRole(['platform_admin', 'university_admin', 'organizer']), async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ success: false, error: 'Invalid event ID' });
    return;
  }

  const events: any[] = await query('SELECT * FROM events WHERE id = ?', [id]);
  if (events.length === 0) {
    res.status(404).json({ success: false, error: 'Event not found' });
    return;
  }

  const event = events[0];

  // Access control check
  if (req.user!.role !== 'platform_admin') {
    if (req.user!.university_id !== event.university_id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: You cannot modify an event belonging to another university.',
      });
      return;
    }

    if (req.user!.role === 'organizer' && event.organizer_id !== req.user!.id) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Organizers can only modify their own events.',
      });
      return;
    }
  }

  const { titleEn, titleKm, descriptionEn, descriptionKm, capacity, status, eventVerification } = req.body;

  await query(
    `UPDATE events
     SET title_en = COALESCE(?, title_en),
         title_km = COALESCE(?, title_km),
         description_en = COALESCE(?, description_en),
         description_km = COALESCE(?, description_km),
         capacity = COALESCE(?, capacity),
         status = COALESCE(?, status),
         event_verification = COALESCE(?, event_verification)
     WHERE id = ?`,
    [titleEn, titleKm, descriptionEn, descriptionKm, capacity, status, eventVerification, id]
  );

  await logAudit({
    userId: req.user!.id,
    universityId: event.university_id,
    action: 'EVENT_UPDATED',
    entityType: 'EVENT',
    entityId: id,
    details: req.body,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Event updated successfully' });
});

// 5. Register for Event (Acceptance Tests 6, 7, 8: Transactional, Duplicate Prevention & Concurrency Control)
router.post('/:id/register', authenticate, async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ success: false, error: 'Invalid event ID' });
    return;
  }

  const userId = req.user!.id;

  try {
    const registrationResult = await withTransaction(async (conn) => {
      // 1. Lock event row with FOR UPDATE to prevent race conditions during concurrent requests
      const [eventRows]: any = await conn.query(
        `SELECT id, university_id, title_en, title_km, capacity, registered_count,
                status, event_verification, registration_deadline
         FROM events
         WHERE id = ? FOR UPDATE`,
        [eventId]
      );

      if (eventRows.length === 0) {
        throw { statusCode: 404, message: 'Event not found' };
      }

      const event = eventRows[0];

      // Check event is published
      if (event.status !== 'published') {
        throw { statusCode: 400, message: 'Event is not open for registration' };
      }

      // Check deadline
      if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
        throw { statusCode: 400, message: 'Registration deadline has passed' };
      }

      // Check capacity under lock (Acceptance Test 8)
      if (event.registered_count >= event.capacity) {
        throw { statusCode: 400, message: 'Event capacity has been reached' };
      }

      // Check existing registration (Acceptance Test 7: Duplicate registrations rejected)
      const [existingRegs]: any = await conn.query(
        'SELECT id, status FROM event_registrations WHERE event_id = ? AND user_id = ?',
        [eventId, userId]
      );

      if (existingRegs.length > 0) {
        if (existingRegs[0].status === 'confirmed') {
          throw { statusCode: 409, message: 'You are already registered for this event' };
        } else if (existingRegs[0].status === 'cancelled') {
          // Re-activate cancelled registration
          await conn.query(
            `UPDATE event_registrations SET status = 'confirmed', registered_at = NOW(), cancelled_at = NULL WHERE id = ?`,
            [existingRegs[0].id]
          );
          await conn.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = ?', [eventId]);
          return { registrationId: existingRegs[0].id, reactivated: true };
        }
      }

      // Insert new registration
      const [insertRes]: any = await conn.query(
        `INSERT INTO event_registrations (event_id, user_id, status, registered_at) VALUES (?, ?, 'confirmed', NOW())`,
        [eventId, userId]
      );

      // Increment registered_count atomically
      await conn.query('UPDATE events SET registered_count = registered_count + 1 WHERE id = ?', [eventId]);

      // Add notification for the user
      await conn.query(
        `INSERT INTO notifications (user_id, title_en, title_km, message_en, message_km, type)
         VALUES (?, 'Registration Confirmed', 'ការចុះឈ្មោះត្រូវបានបញ្ជាក់', ?, ?, 'event_registered')`,
        [
          userId,
          `You have successfully registered for: ${event.title_en}`,
          `អ្នកបានចុះឈ្មោះដោយជោគជ័យសម្រាប់៖ ${event.title_km}`,
        ]
      );

      return { registrationId: insertRes.insertId, reactivated: false };
    });

    await logAudit({
      userId,
      action: 'EVENT_REGISTRATION_SUCCESS',
      entityType: 'EVENT_REGISTRATION',
      entityId: registrationResult.registrationId,
      details: { eventId },
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Event registration confirmed',
      data: registrationResult,
    });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Registration failed',
    });
  }
});

// 6. Cancel Registration
router.post('/:id/cancel', authenticate, async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ success: false, error: 'Invalid event ID' });
    return;
  }

  const userId = req.user!.id;

  try {
    await withTransaction(async (conn) => {
      const [regs]: any = await conn.query(
        `SELECT id, status FROM event_registrations WHERE event_id = ? AND user_id = ? FOR UPDATE`,
        [eventId, userId]
      );

      if (regs.length === 0 || regs[0].status === 'cancelled') {
        throw { statusCode: 400, message: 'No active registration found for this event' };
      }

      // Mark cancelled
      await conn.query(
        `UPDATE event_registrations SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`,
        [regs[0].id]
      );

      // Decrement count
      await conn.query(
        `UPDATE events SET registered_count = GREATEST(0, registered_count - 1) WHERE id = ?`,
        [eventId]
      );
    });

    await logAudit({
      userId,
      action: 'EVENT_REGISTRATION_CANCELLED',
      entityType: 'EVENT_REGISTRATION',
      details: { eventId },
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Registration successfully cancelled' });
  } catch (err: any) {
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Cancellation failed' });
  }
});

// 7. Toggle Event Favorite
router.post('/:id/favorite', authenticate, async (req: Request, res: Response): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ success: false, error: 'Invalid event ID' });
    return;
  }

  const userId = req.user!.id;

  const existing = await query('SELECT id FROM event_favorites WHERE event_id = ? AND user_id = ?', [eventId, userId]);
  if (existing.length > 0) {
    await query('DELETE FROM event_favorites WHERE id = ?', [existing[0].id]);
    res.json({ success: true, isFavorited: false, message: 'Removed from favorites' });
  } else {
    await query('INSERT INTO event_favorites (event_id, user_id) VALUES (?, ?)', [eventId, userId]);
    res.json({ success: true, isFavorited: true, message: 'Added to favorites' });
  }
});

export default router;
