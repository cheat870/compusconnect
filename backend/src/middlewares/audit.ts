import { query } from '../database/connection.js';

export interface AuditLogEntry {
  userId?: number | null;
  universityId?: number | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
}

export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, university_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.userId || null,
        entry.universityId || null,
        entry.action,
        entry.entityType,
        entry.entityId || null,
        entry.details ? JSON.stringify(entry.details) : null,
        entry.ipAddress || null,
      ]
    );
  } catch (error) {
    console.error('[AuditLog] Failed to record audit log:', error);
  }
}
