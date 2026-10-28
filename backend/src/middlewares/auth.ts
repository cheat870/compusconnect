import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { query } from '../database/connection.js';

export interface AuthUser {
  id: number;
  email: string;
  role: 'platform_admin' | 'university_admin' | 'organizer' | 'student';
  university_id: number | null;
  full_name: string;
  full_name_km?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
    const users: any[] = await query(
      'SELECT id, email, role, university_id, full_name, full_name_km, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      res.status(401).json({ success: false, error: 'User account not found or deactivated' });
      return;
    }

    req.user = users[0];
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
  }
}

export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
}

export function enforceUniversityScope(paramName: string = 'universityId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Platform admin has unrestricted global access
    if (req.user.role === 'platform_admin') {
      return next();
    }

    const targetUniversityId = parseInt(
      req.params[paramName] || req.body[paramName] || (req.query[paramName] as string),
      10
    );

    if (isNaN(targetUniversityId)) {
      res.status(400).json({ success: false, error: `Invalid ${paramName} parameter` });
      return;
    }

    if (req.user.university_id !== targetUniversityId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You cannot view or modify data belonging to another institution.',
      });
      return;
    }

    next();
  };
}
