import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../database/connection.js';
import { authenticate } from '../middlewares/auth.js';
import { logAudit } from '../middlewares/audit.js';

const router = Router();

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  fullNameKm: z.string().optional(),
  phone: z.string().optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().optional(),
    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      const confirm = data.confirmPassword || data.confirmNewPassword;
      return !confirm || data.newPassword === confirm;
    },
    {
      message: 'New passwords do not match',
      path: ['confirmPassword'],
    }
  );

function formatUserResponse(u: any) {
  if (!u) return null;
  return {
    ...u,
    fullName: u.full_name,
    fullNameKm: u.full_name_km,
    universityId: u.university_id,
    avatarUrl: u.avatar_url,
    studentIdNumber: u.student_id_number,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
  };
}

/**
 * GET /api/v1/users/me
 * Get current user profile details
 */
router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const users: any[] = await query(
    `SELECT u.id, u.email, u.full_name, u.full_name_km, u.role, u.university_id, u.phone, u.avatar_url,
            u.last_login_at, u.created_at,
            un.name_en AS university_name_en, un.name_km AS university_name_km, un.acronym AS university_acronym,
            um.student_id_number
     FROM users u
     LEFT JOIN universities un ON u.university_id = un.id
     LEFT JOIN university_memberships um ON u.id = um.user_id AND um.university_id = u.university_id
     WHERE u.id = ?`,
    [req.user!.id]
  );

  if (users.length === 0) {
    res.status(404).json({ success: false, error: 'User profile not found' });
    return;
  }

  res.json({ success: true, data: formatUserResponse(users[0]) });
});

/**
 * PATCH /api/v1/users/me
 * Update current user's profile information
 */
router.patch('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const parseResult = updateProfileSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { fullName, fullNameKm, phone } = parseResult.data;
  const updates: string[] = [];
  const params: any[] = [];

  if (fullName !== undefined) {
    updates.push('full_name = ?');
    params.push(fullName);
  }
  if (fullNameKm !== undefined) {
    updates.push('full_name_km = ?');
    params.push(fullNameKm || null);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone || null);
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No profile fields provided for update' });
    return;
  }

  params.push(req.user!.id);
  await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  await logAudit({
    userId: req.user!.id,
    universityId: req.user!.university_id,
    action: 'USER_PROFILE_UPDATED',
    entityType: 'USER',
    entityId: req.user!.id,
    details: parseResult.data,
    ipAddress: req.ip,
  });

  const updatedUsers: any[] = await query(
    `SELECT u.id, u.email, u.full_name, u.full_name_km, u.role, u.university_id, u.phone, u.avatar_url,
            un.name_en AS university_name_en, un.name_km AS university_name_km, un.acronym AS university_acronym
     FROM users u
     LEFT JOIN universities un ON u.university_id = un.id
     WHERE u.id = ?`,
    [req.user!.id]
  );

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: formatUserResponse(updatedUsers[0]),
  });
});

/**
 * PATCH /api/v1/users/me/password
 * Change password with current-password verification
 */
router.patch('/me/password', authenticate, async (req: Request, res: Response): Promise<void> => {
  const parseResult = changePasswordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
    return;
  }

  const { currentPassword, newPassword } = parseResult.data;

  // Fetch current password hash
  const users: any[] = await query('SELECT password_hash FROM users WHERE id = ?', [req.user!.id]);
  if (users.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, users[0].password_hash);
  if (!isCurrentValid) {
    res.status(401).json({ success: false, error: 'Current password is incorrect' });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user!.id]);

  // Invalidate previous sessions upon password change for security
  await query('UPDATE user_sessions SET is_valid = FALSE WHERE user_id = ?', [req.user!.id]);

  // Log password change
  await logAudit({
    userId: req.user!.id,
    universityId: req.user!.university_id,
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'USER',
    entityId: req.user!.id,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Password has been successfully changed' });
});

export default router;
