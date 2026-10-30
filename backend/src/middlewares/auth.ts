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
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

/**
 * Primary Authentication Middleware
 * Supports both secure HttpOnly cookies (browser) and Bearer Authorization headers (API/tests)
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  let token: string | null = null;

  // 1. Check HttpOnly cookie
  if (req.cookies?.campusconnect_token) {
    token = req.cookies.campusconnect_token;
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // 2. Check Authorization Bearer header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. No session or token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };

    // Check if session has been explicitly revoked in user_sessions
    const sessions: any[] = await query(
      'SELECT id, is_valid FROM user_sessions WHERE session_token = ?',
      [token]
    );

    if (sessions.length > 0 && !sessions[0].is_valid) {
      res.status(401).json({ success: false, error: 'Session revoked or invalidated. Please sign in again.' });
      return;
    }

    const users: any[] = await query(
      'SELECT id, email, role, university_id, full_name, full_name_km, phone, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      res.status(401).json({ success: false, error: 'User account not found or deactivated' });
      return;
    }

    req.user = users[0];
    req.sessionToken = token;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
  }
}

export const requireAuth = authenticate;

/**
 * Role-Based Access Control (RBAC) Middleware
 */
export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Forbidden: Access requires one of roles [${allowedRoles.join(', ')}]. Current role: '${req.user.role}'`,
      });
      return;
    }

    next();
  };
}

export const requireRole = authorizeRole;

/**
 * Multi-University Tenant Isolation Middleware
 */
export function enforceUniversityScope(paramName: string = 'universityId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Platform admin has unrestricted global access across all institutions
    if (req.user.role === 'platform_admin') {
      return next();
    }

    const rawId = req.params[paramName] || req.body[paramName] || (req.query[paramName] as string);
    const targetUniversityId = rawId !== undefined ? parseInt(String(rawId), 10) : NaN;

    if (isNaN(targetUniversityId)) {
      res.status(400).json({ success: false, error: `Invalid ${paramName} parameter` });
      return;
    }

    if (req.user.university_id !== targetUniversityId) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: University administrator cannot access or modify records belonging to another university.',
      });
      return;
    }

    next();
  };
}

export const requireUniversityAccess = enforceUniversityScope;

/**
 * Resource Ownership Verification Middleware (e.g. for event organizers)
 */
export function requireResourceOwnership(
  getOwnerId: (req: Request) => Promise<number | null | undefined>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'platform_admin') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);
      if (ownerId === undefined || ownerId === null) {
        res.status(404).json({ success: false, error: 'Target resource not found' });
        return;
      }

      if (req.user.role === 'organizer' && ownerId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: Organizers can manage only events assigned to or owned by them.',
        });
        return;
      }

      next();
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Resource verification failed' });
    }
  };
}
