import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { config } from '../config/index.js';
import { authenticate } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  fullNameKm: z.string().optional(),
  universityId: z.number().int().positive(),
  studentIdNumber: z.string().optional(),
  phone: z.string().optional(),
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { email, password } = parseResult.data;
  const users: any[] = await query(
    `SELECT u.*, un.name_en AS university_name_en, un.name_km AS university_name_km, un.acronym AS university_acronym
     FROM users u
     LEFT JOIN universities un ON u.university_id = un.id
     WHERE u.email = ?`,
    [email]
  );

  if (users.length === 0) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const user = users[0];
  if (!user.is_active) {
    res.status(403).json({ success: false, error: 'Account has been deactivated' });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, universityId: user.university_id },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  await logAudit({
    userId: user.id,
    universityId: user.university_id,
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email },
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        fullNameKm: user.full_name_km,
        role: user.role,
        universityId: user.university_id,
        universityNameEn: user.university_name_en,
        universityNameKm: user.university_name_km,
        universityAcronym: user.university_acronym,
        phone: user.phone,
      },
    },
  });
});

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { email, password, fullName, fullNameKm, universityId, studentIdNumber, phone } = parseResult.data;

  // Check university exists
  const universities: any[] = await query('SELECT id FROM universities WHERE id = ? AND is_active = TRUE', [universityId]);
  if (universities.length === 0) {
    res.status(400).json({ success: false, error: 'Selected university does not exist or is inactive' });
    return;
  }

  // Check email uniqueness
  const existingUsers: any[] = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUsers.length > 0) {
    res.status(409).json({ success: false, error: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result: any = await query(
    `INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
     VALUES (?, ?, ?, ?, 'student', ?, ?)`,
    [email, passwordHash, fullName, fullNameKm || null, universityId, phone || null]
  );

  const newUserId = result.insertId;

  // Record membership
  await query(
    `INSERT INTO university_memberships (user_id, university_id, role, student_id_number, status)
     VALUES (?, ?, 'student', ?, 'active')`,
    [newUserId, universityId, studentIdNumber || null]
  );

  await logAudit({
    userId: newUserId,
    universityId,
    action: 'USER_REGISTERED',
    entityType: 'USER',
    entityId: newUserId,
    details: { email, studentIdNumber },
    ipAddress: req.ip,
  });

  const token = jwt.sign(
    { userId: newUserId, role: 'student', universityId },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: newUserId,
        email,
        fullName,
        fullNameKm,
        role: 'student',
        universityId,
        phone,
      },
    },
  });
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const users: any[] = await query(
    `SELECT u.id, u.email, u.full_name, u.full_name_km, u.role, u.university_id, u.phone, u.avatar_url,
            un.name_en AS university_name_en, un.name_km AS university_name_km, un.acronym AS university_acronym
     FROM users u
     LEFT JOIN universities un ON u.university_id = un.id
     WHERE u.id = ?`,
    [req.user!.id]
  );

  if (users.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  res.json({ success: true, data: users[0] });
});

export default router;
