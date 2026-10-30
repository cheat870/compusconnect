import bcrypt from 'bcryptjs';
import { query, closePool, getPool } from '../database/connection.js';
import { logAudit } from '../middlewares/audit.js';

export async function bootstrapAdmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@campusconnect.edu.kh';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Password123!';
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME || 'Platform Administrator';
  const force = process.argv.includes('--force');

  console.log('----------------------------------------------------');
  console.log('🚀 CampusConnect Initial Administrator Bootstrap');
  console.log('----------------------------------------------------');

  try {
    // Check if an active platform admin already exists
    const existingAdmins: any[] = await query(
      "SELECT id, email FROM users WHERE role = 'platform_admin' AND is_active = TRUE"
    );

    if (existingAdmins.length > 0 && !force) {
      console.warn(`[Bootstrap] Warning: A platform administrator already exists (${existingAdmins[0].email}).`);
      console.warn('[Bootstrap] Repeated bootstrap operations are blocked for security.');
      console.warn('[Bootstrap] Use --force flag only if authorized credential recovery is required.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const existingUser: any[] = await query('SELECT id FROM users WHERE email = ?', [email]);

    let adminId: number;
    if (existingUser.length > 0) {
      adminId = existingUser[0].id;
      await query(
        `UPDATE users 
         SET password_hash = ?, role = 'platform_admin', full_name = ?, is_active = TRUE, updated_at = NOW() 
         WHERE id = ?`,
        [passwordHash, fullName, adminId]
      );
      console.log(`[Bootstrap] Existing account for ${email} upgraded to Platform Administrator (ID: ${adminId}).`);
    } else {
      const result: any = await query(
        `INSERT INTO users (email, password_hash, full_name, role, university_id, is_active)
         VALUES (?, ?, ?, 'platform_admin', NULL, TRUE)`,
        [email, passwordHash, fullName]
      );
      adminId = result.insertId;
      console.log(`[Bootstrap] Created new Platform Administrator ${email} (ID: ${adminId}).`);
    }

    await logAudit({
      userId: adminId,
      action: 'BOOTSTRAP_ADMIN_SETUP',
      entityType: 'USER',
      entityId: adminId,
      details: { email, enforced: force },
    });

    console.log('[Bootstrap] Initial administrator bootstrap completed successfully.');
    console.log('----------------------------------------------------');
  } catch (error) {
    console.error('[Bootstrap] Failed to bootstrap administrator:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

if (process.argv[1]?.includes('bootstrap-admin')) {
  bootstrapAdmin();
}
