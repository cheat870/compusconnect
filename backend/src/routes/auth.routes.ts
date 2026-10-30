import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { config } from '../config/index.js';
import { authenticate } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  fullNameKm: z.string().optional(),
  email: z.string().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().optional(),
  universityId: z.number().int().positive('Valid university selection is required'),
  studentIdNumber: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.confirmPassword === undefined || data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * 1. POST /api/v1/auth/login
 * Generic error messaging, session persistence, HttpOnly cookie & Bearer token support
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { email, password } = parseResult.data;

  // Query user with university details
  const users: any[] = await query(
    `SELECT u.*, un.name_en AS university_name_en, un.name_km AS university_name_km, un.acronym AS university_acronym
     FROM users u
     LEFT JOIN universities un ON u.university_id = un.id
     WHERE u.email = ?`,
    [email]
  );

  // Generic login error message: never reveal whether account exists
  if (users.length === 0) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  const user = users[0];

  if (!user.is_active) {
    res.status(403).json({ success: false, error: 'Account has been deactivated. Please contact administration.' });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    res.status(401).json({ success: false, error: 'Invalid email or password' });
    return;
  }

  // Issue standard JWT session token
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      universityId: user.university_id,
      jti: crypto.randomUUID(),
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  // Track session in user_sessions table
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await query(
    `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, is_valid, expires_at)
     VALUES (?, ?, ?, ?, TRUE, ?)`,
    [user.id, token, req.ip, req.headers['user-agent'] || null, expiresAt]
  );

  // Update last_login_at for accurate active user tracking
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

  await logAudit({
    userId: user.id,
    universityId: user.university_id,
    action: 'USER_LOGIN',
    entityType: 'USER',
    entityId: user.id,
    details: { email: user.email },
    ipAddress: req.ip,
  });

  // Set secure HttpOnly cookie
  res.cookie('campusconnect_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Return user info and token (for API clients and backward compatibility)
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

/**
 * 2. POST /api/v1/auth/register
 * Public registration strictly assigns 'student' role. Privileged role selection is disallowed.
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { email, password, fullName, fullNameKm, universityId, studentIdNumber, phone } = parseResult.data;

  // Validate university existence
  const universities: any[] = await query(
    'SELECT id, name_en, name_km, acronym FROM universities WHERE id = ? AND is_active = TRUE',
    [universityId]
  );
  if (universities.length === 0) {
    res.status(400).json({ success: false, error: 'Selected university does not exist or is inactive' });
    return;
  }
  const university = universities[0];

  // Validate duplicate email
  const existingUsers: any[] = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUsers.length > 0) {
    res.status(409).json({ success: false, error: 'An account with this email already exists' });
    return;
  }

  // Hash password securely with bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash(password, 10);

  // Strictly enforce 'student' role for public registrations
  const result: any = await query(
    `INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone, last_login_at)
     VALUES (?, ?, ?, ?, 'student', ?, ?, NOW())`,
    [email, passwordHash, fullName, fullNameKm || null, universityId, phone || null]
  );

  const newUserId = result.insertId;

  // Create university membership
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
    {
      userId: newUserId,
      role: 'student',
      universityId,
      jti: crypto.randomUUID(),
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn as any }
  );

  // Track session
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, is_valid, expires_at)
     VALUES (?, ?, ?, ?, TRUE, ?)`,
    [newUserId, token, req.ip, req.headers['user-agent'] || null, expiresAt]
  );

  res.cookie('campusconnect_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

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
        universityNameEn: university.name_en,
        universityNameKm: university.name_km,
        universityAcronym: university.acronym,
        phone,
      },
    },
  });
});

/**
 * 3. GET /api/v1/auth/me
 * Returns authenticated user profile
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const users: any[] = await query(
    `SELECT u.id, u.email, u.full_name, u.full_name_km, u.role, u.university_id, u.phone, u.avatar_url,
            u.last_login_at, u.created_at,
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

/**
 * 4. POST /api/v1/auth/logout
 * Invalidates session in database and clears HttpOnly cookie
 */
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  if (req.sessionToken) {
    await query('UPDATE user_sessions SET is_valid = FALSE WHERE session_token = ?', [req.sessionToken]);
  }

  await logAudit({
    userId: req.user!.id,
    universityId: req.user!.university_id,
    action: 'USER_LOGOUT',
    entityType: 'USER',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });

  res.clearCookie('campusconnect_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.json({ success: true, message: 'Logged out successfully and session invalidated' });
});

/**
 * 5. POST /api/v1/auth/forgot-password
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: 'Email is required' });
    return;
  }

  const users: any[] = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (users.length === 0) {
    res.json({ success: true, message: 'If this email exists, a password reset token has been generated.' });
    return;
  }

  const userId = users[0].id;
  const token = (await import('crypto')).randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );

  await logAudit({
    userId,
    action: 'PASSWORD_RESET_REQUESTED',
    entityType: 'USER',
    entityId: userId,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'Password reset token generated.',
    resetToken: token,
  });
});

/**
 * 6. POST /api/v1/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    res.status(400).json({ success: false, error: 'Valid token and minimum 8-character password are required' });
    return;
  }

  const resets: any[] = await query(
    'SELECT id, user_id FROM password_resets WHERE token = ? AND used = FALSE AND expires_at > NOW()',
    [token]
  );

  if (resets.length === 0) {
    res.status(400).json({ success: false, error: 'Invalid or expired password reset token' });
    return;
  }

  const resetRecord = resets[0];
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, resetRecord.user_id]);
  await query('UPDATE password_resets SET used = TRUE WHERE id = ?', [resetRecord.id]);
  // Invalidate any active sessions for security
  await query('UPDATE user_sessions SET is_valid = FALSE WHERE user_id = ?', [resetRecord.user_id]);

  await logAudit({
    userId: resetRecord.user_id,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'USER',
    entityId: resetRecord.user_id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Password has been successfully updated.' });
});

export default router;
