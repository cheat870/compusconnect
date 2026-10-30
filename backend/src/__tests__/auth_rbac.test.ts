import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { runMigrations } from '../database/migrate.js';
import { runSeeds } from '../database/seed.js';
import { closePool, query } from '../database/connection.js';

describe('CampusConnect Secure Authentication, RBAC & Admin Dashboard Tests', () => {
  let app: any;
  let platformAdminToken: string;
  let platformAdminCookie: string;
  let ruppAdminToken: string;
  let ruppOrganizerToken: string;
  let studentToken: string;
  let itcAdminToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();

    await runMigrations('campusconnect_test');
    await runSeeds('campusconnect_test');

    // Authenticate platform admin
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@campusconnect.edu.kh', password: 'Password123!' });
    platformAdminToken = adminLogin.body.data.token;
    platformAdminCookie = adminLogin.headers['set-cookie']?.[0] || '';

    // Authenticate RUPP admin
    const ruppAdminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rupp.admin@rupp.edu.kh', password: 'Password123!' });
    ruppAdminToken = ruppAdminLogin.body.data.token;

    // Authenticate RUPP organizer
    const ruppOrgLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ckcc.organizer@rupp.edu.kh', password: 'Password123!' });
    ruppOrganizerToken = ruppOrgLogin.body.data.token;

    // Authenticate ITC admin
    const itcAdminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'itc.admin@itc.edu.kh', password: 'Password123!' });
    itcAdminToken = itcAdminLogin.body.data.token;

    // Authenticate regular student
    const studentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@rupp.edu.kh', password: 'Password123!' });
    studentToken = studentLogin.body.data.token;
  }, 60000);

  afterAll(async () => {
    await closePool();
  }, 30000);

  describe('1. Registration Security & Privilege Escalation Prevention', () => {
    it('allows public student registration with valid credentials and confirmation', async () => {
      const email = `test_student_${Date.now()}@rupp.edu.kh`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Test Candidate Student',
          fullNameKm: 'និស្សិត សាកល្បង',
          email,
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
          universityId: 1,
          studentIdNumber: 'RUPP-2026-999',
          phone: '012999888',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.token).toBeDefined();
    });

    it('prevents privilege escalation: public registration strictly assigns student role even if privileged role is requested', async () => {
      const email = `hacker_escalate_${Date.now()}@test.edu.kh`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Malicious Privileged Attempt',
          email,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          universityId: 1,
          role: 'platform_admin', // Attempted privilege escalation
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('student');

      // Verify directly in DB
      const dbUsers: any[] = await query('SELECT role FROM users WHERE email = ?', [email]);
      expect(dbUsers[0].role).toBe('student');
    });

    it('rejects registration when password confirmation does not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Mismatch Tester',
          email: `mismatch_${Date.now()}@rupp.edu.kh`,
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
          universityId: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Passwords do not match');
    });

    it('rejects registration when password lacks minimum length or required character types', async () => {
      // Too short (< 8 chars)
      const resShort = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Short Tester',
          email: `short_${Date.now()}@rupp.edu.kh`,
          password: 'Pass1',
          confirmPassword: 'Pass1',
          universityId: 1,
        });
      expect(resShort.status).toBe(400);

      // Only letters (no numbers)
      const resNoNum = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'No Num Tester',
          email: `nonum_${Date.now()}@rupp.edu.kh`,
          password: 'OnlyLettersPassword',
          confirmPassword: 'OnlyLettersPassword',
          universityId: 1,
        });
      expect(resNoNum.status).toBe(400);

      // Only numbers (no letters)
      const resNoLetters = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'No Letters Tester',
          email: `noletters_${Date.now()}@rupp.edu.kh`,
          password: '1234567890',
          confirmPassword: '1234567890',
          universityId: 1,
        });
      expect(resNoLetters.status).toBe(400);
    });

    it('rejects duplicate email with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Duplicate Student',
          email: 'student@rupp.edu.kh', // Existing seeded email
          password: 'Password123!',
          confirmPassword: 'Password123!',
          universityId: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('2. Login Security, Generic Errors & Session Cookies', () => {
    it('returns generic error for non-existent email preventing account enumeration', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user.987654@rupp.edu.kh',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('returns identical generic error for existing user with wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@rupp.edu.kh',
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('sets HttpOnly session cookie and records last_login_at upon successful login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@rupp.edu.kh',
          password: 'Password123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();

      // Check HttpOnly cookie
      const rawCookies = res.headers['set-cookie'];
      expect(rawCookies).toBeDefined();
      const cookieHeader = Array.isArray(rawCookies) ? rawCookies.join(';') : (rawCookies || '');
      expect(cookieHeader).toContain('campusconnect_token');
      expect(cookieHeader.toLowerCase()).toContain('httponly');
      expect(cookieHeader.toLowerCase()).toContain('samesite=lax');

      // Verify last_login_at in database
      const rows: any[] = await query('SELECT last_login_at FROM users WHERE email = ?', [
        'student@rupp.edu.kh',
      ]);
      expect(rows[0].last_login_at).not.toBeNull();
    });
  });

  describe('3. Profile Management & Password Modification', () => {
    let testUserToken: string;
    let testUserId: number;
    const testEmail = `profile_test_${Date.now()}@rupp.edu.kh`;

    beforeAll(async () => {
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Profile Original Name',
          email: testEmail,
          password: 'InitialPassword123!',
          confirmPassword: 'InitialPassword123!',
          universityId: 1,
        });
      testUserToken = reg.body.data.token;
      testUserId = reg.body.data.user.id;
    });

    it('retrieves current authenticated profile via GET /api/v1/users/me', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testEmail);
      expect(res.body.data.fullName).toBe('Profile Original Name');
    });

    it('updates user profile via PATCH /api/v1/users/me', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          fullName: 'Profile Updated Name',
          fullNameKm: 'ឈ្មោះ កែប្រែ',
          phone: '012888999',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Profile Updated Name');
      expect(res.body.data.fullNameKm).toBe('ឈ្មោះ កែប្រែ');
      expect(res.body.data.phone).toBe('012888999');
    });

    it('rejects password change if current password is incorrect', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'BrandNewPassword123!',
          confirmNewPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Current password is incorrect');
    });

    it('successfully changes password with valid current password verification', async () => {
      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          currentPassword: 'InitialPassword123!',
          newPassword: 'BrandNewPassword123!',
          confirmNewPassword: 'BrandNewPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login works with new password
      const newLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'BrandNewPassword123!',
        });
      expect(newLogin.status).toBe(200);

      // Verify login fails with old password
      const oldLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'InitialPassword123!',
        });
      expect(oldLogin.status).toBe(401);
    });
  });

  describe('4. Session Management, Logout & Token Revocation', () => {
    it('invalidates database session and clears cookie upon logout', async () => {
      // Login to obtain active session
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@rupp.edu.kh',
          password: 'Password123!',
        });
      const token = loginRes.body.data.token;
      const cookie = loginRes.headers['set-cookie']?.[0] || '';

      // Test that token works before logout
      const beforeMe = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(beforeMe.status).toBe(200);

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Cookie should be expired / cleared
      const rawLogoutCookies = logoutRes.headers['set-cookie'];
      const logoutCookies = Array.isArray(rawLogoutCookies) ? rawLogoutCookies.join(';') : (rawLogoutCookies || '');
      expect(logoutCookies).toContain('campusconnect_token=;');

      // Attempting to access protected resource with revoked token should fail
      const afterMe = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);
      expect(afterMe.status).toBe(401);
      expect(afterMe.body.error).toContain('Session revoked');
    });
  });

  describe('5. RBAC Endpoint Access Restrictions & Tenant Isolation', () => {
    it('blocks anonymous access to Admin endpoints with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('blocks student access to Admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('blocks organizer access to Admin endpoints with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${ruppOrganizerToken}`);
      expect(res.status).toBe(403);
    });

    it('allows University Admin to access dashboard scoped to their university', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${ruppAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics).toBeDefined();
      expect(res.body.data.metrics.totalUsers).toBeGreaterThan(0);
    });

    it('enforces Tenant Isolation: University Admin only sees users from their institution', async () => {
      // RUPP Admin (University ID: 1)
      const ruppRes = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${ruppAdminToken}`);

      expect(ruppRes.status).toBe(200);
      const ruppUsers = ruppRes.body.data;
      // All returned users must belong to university 1
      ruppUsers.forEach((u: any) => {
        expect(u.university_id).toBe(1);
      });

      // ITC Admin (University ID: 2)
      const itcRes = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${itcAdminToken}`);

      expect(itcRes.status).toBe(200);
      const itcUsers = itcRes.body.data;
      itcUsers.forEach((u: any) => {
        expect(u.university_id).toBe(2);
      });
    });

    it('enforces Tenant Isolation: University Admin cannot alter users belonging to another university', async () => {
      // Get an ITC user ID
      const itcUsers: any[] = await query('SELECT id FROM users WHERE university_id = 2 LIMIT 1');
      const itcUserId = itcUsers[0].id;

      // RUPP Admin tries to modify ITC user's role
      const res = await request(app)
        .patch(`/api/v1/admin/users/${itcUserId}/role`)
        .set('Authorization', `Bearer ${ruppAdminToken}`)
        .send({ role: 'organizer' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Cannot change roles for users belonging to another university');
    });

    it('allows Platform Admin to view all users across all institutions', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${platformAdminToken}`);

      expect(res.status).toBe(200);
      const allUsers = res.body.data;
      const universityIds = new Set(allUsers.map((u: any) => u.university_id));
      // Should include users from multiple universities (RUPP, ITC, etc.)
      expect(universityIds.size).toBeGreaterThan(1);
    });

    it('allows Platform Admin to modify user roles and creates audit log', async () => {
      // Register temporary student to promote
      const tempEmail = `promote_me_${Date.now()}@rupp.edu.kh`;
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Promote Target',
          email: tempEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          universityId: 1,
        });
      const targetUserId = reg.body.data.user.id;

      // Platform admin promotes to organizer
      const promoteRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ role: 'organizer' });

      expect(promoteRes.status).toBe(200);
      expect(promoteRes.body.success).toBe(true);

      // Verify in DB
      const dbCheck: any[] = await query('SELECT role FROM users WHERE id = ?', [targetUserId]);
      expect(dbCheck[0].role).toBe('organizer');

      // Verify audit log entry
      const auditRes = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${platformAdminToken}`);
      expect(auditRes.status).toBe(200);
      const logs = auditRes.body.data;
      const roleLog = logs.find((l: any) => l.action === 'USER_ROLE_CHANGED' && l.entity_id === targetUserId);
      expect(roleLog).toBeDefined();
    });

    it('allows Platform Admin to activate and deactivate user accounts', async () => {
      // Create user
      const tempEmail = `status_test_${Date.now()}@rupp.edu.kh`;
      const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({
          fullName: 'Status Target',
          email: tempEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          universityId: 1,
        });
      const targetUserId = reg.body.data.user.id;

      // Deactivate user
      const deactivateRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: false });

      expect(deactivateRes.status).toBe(200);

      // Deactivated user cannot log in
      const failedLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: tempEmail,
          password: 'Password123!',
        });
      expect(failedLogin.status).toBe(403);
      expect(failedLogin.body.error).toContain('Account has been deactivated');

      // Reactivate user
      const reactivateRes = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${platformAdminToken}`)
        .send({ isActive: true });
      expect(reactivateRes.status).toBe(200);

      // Reactivated user can now log in
      const successLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: tempEmail,
          password: 'Password123!',
        });
      expect(successLogin.status).toBe(200);
    });
  });

  describe('6. Event Moderation with Mandatory Rejection Reasons', () => {
    let pendingEventId: number;

    beforeAll(async () => {
      // Create an event submitted for approval
      const createRes = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${ruppOrganizerToken}`)
        .send({
          universityId: 1,
          campusId: 1,
          slug: `pending-hackathon-${Date.now()}`,
          titleEn: 'Pending Review Hackathon',
          titleKm: 'ការប្រកួតសរសេរកូដរង់ចាំការអនុម័ត',
          descriptionEn: 'Hackathon submitted for university review and verification.',
          descriptionKm: 'ការប្រកួតសរសេរកូដរង់ចាំការអនុម័តពីសាកលវិទ្យាល័យ។',
          startTime: '2026-11-20 08:00:00',
          endTime: '2026-11-20 17:00:00',
          capacity: 50,
          category: 'technology',
          status: 'published',
          eventVerification: 'confirmed',
          dataClassification: 'verified_public',
          sourceUrl: 'https://rupp.edu.kh/announcements/hackathon-2026',
        });
      expect(createRes.status).toBe(201);
      pendingEventId = createRes.body.data.id;
    });

    it('rejecting an event requires a non-empty rejection_reason (fails with 400 if missing)', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/events/${pendingEventId}/reject`)
        .set('Authorization', `Bearer ${ruppAdminToken}`)
        .send({}); // Missing rejectionReason

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Rejection reason is mandatory');
    });

    it('rejecting an event with valid reason updates status to rejected and records reason', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/events/${pendingEventId}/reject`)
        .set('Authorization', `Bearer ${ruppAdminToken}`)
        .send({ rejectionReason: 'Official university letterhead missing from announcement.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB
      const dbCheck: any[] = await query(
        'SELECT approval_status, rejection_reason FROM events WHERE id = ?',
        [pendingEventId]
      );
      expect(dbCheck[0].approval_status).toBe('rejected');
      expect(dbCheck[0].rejection_reason).toBe(
        'Official university letterhead missing from announcement.'
      );
    });

    it('approving an event updates approval_status to approved and clears previous rejection reasons', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/events/${pendingEventId}/approve`)
        .set('Authorization', `Bearer ${ruppAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbCheck: any[] = await query(
        'SELECT approval_status, rejection_reason FROM events WHERE id = ?',
        [pendingEventId]
      );
      expect(dbCheck[0].approval_status).toBe('approved');
      expect(dbCheck[0].rejection_reason).toBeNull();
    });
  });

  describe('7. Administrative Boundaries & Reverse Geocoding (Village, Sangkat, Khan)', () => {
    it('returns structured administrative boundaries for coordinates', async () => {
      const res = await request(app)
        .get('/api/v1/geo/reverse?lat=11.55806&lng=104.88696&lang=km');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.sangkat || res.body.data.khan || res.body.data.city).toBeDefined();
    });

    it('rejects invalid coordinates with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/geo/reverse?lat=999&lng=999');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('calculates in-app navigation route between coordinates with turn-by-turn steps', async () => {
      const res = await request(app)
        .get('/api/v1/geo/directions?startLat=11.55806&startLng=104.88696&destLat=11.56810&destLng=104.89280&mode=foot&lang=km');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.distance).toBeGreaterThan(0);
      expect(res.body.data.duration).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.coordinates)).toBe(true);
      expect(res.body.data.coordinates.length).toBeGreaterThan(0);
      expect(Array.isArray(res.body.data.steps)).toBe(true);
    });

    it('rejects invalid directions parameters with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/v1/geo/directions?startLat=invalid');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
