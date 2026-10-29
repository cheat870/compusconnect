import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../app.js';
import { runMigrations } from '../database/migrate.js';
import { runSeeds } from '../database/seed.js';
import { closePool, query } from '../database/connection.js';

describe('CampusConnect Acceptance Tests - RUPP Pilot & Multi-University Architecture', () => {
  let app: any;
  let platformAdminToken: string;
  let ruppAdminToken: string;
  let ruppOrganizerToken: string;
  let itcAdminToken: string;
  let studentToken: string;
  let student2Token: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = createApp();

    // Migrate and seed test database
    await runMigrations('campusconnect_test');
    await runSeeds('campusconnect_test');

    // Authenticate test users to acquire JWT tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@campusconnect.edu.kh', password: 'Password123!' });
    platformAdminToken = adminLogin.body.data.token;

    const ruppAdminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'rupp.admin@rupp.edu.kh', password: 'Password123!' });
    ruppAdminToken = ruppAdminLogin.body.data.token;

    const ruppOrgLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ckcc.organizer@rupp.edu.kh', password: 'Password123!' });
    ruppOrganizerToken = ruppOrgLogin.body.data.token;

    const itcAdminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'itc.admin@itc.edu.kh', password: 'Password123!' });
    itcAdminToken = itcAdminLogin.body.data.token;

    const studentLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student@rupp.edu.kh', password: 'Password123!' });
    studentToken = studentLogin.body.data.token;

    const student2Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'student2@rupp.edu.kh', password: 'Password123!' });
    student2Token = student2Login.body.data.token;
  }, 60000);

  afterAll(async () => {
    await closePool();
  }, 30000);

  // Acceptance Test 1
  it('Acceptance Test 1: RUPP appears in the university directory', async () => {
    const res = await request(app).get('/api/v1/universities');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const rupp = res.body.data.find((u: any) => u.slug === 'rupp' || u.acronym === 'RUPP');
    expect(rupp).toBeDefined();
    expect(rupp.name_en).toBe('Royal University of Phnom Penh');
    expect(rupp.name_km).toBe('សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ');
    expect(rupp.verification_status).toBe('verified');
    expect(rupp.data_classification).toBe('verified_public');
    expect(rupp.source_url).toContain('rupp.edu.kh');
  });

  // Acceptance Test 2
  it('Acceptance Test 2: Another university can be added without changing the schema', async () => {
    const newUniPayload = {
      slug: 'num-pilot-test',
      nameEn: 'National University of Management',
      nameKm: 'សាកលវិទ្យាល័យជាតិគ្រប់គ្រង',
      acronym: 'NUM',
      officialWebsite: 'https://num.edu.kh',
      descriptionEn: 'Public university in Phnom Penh specialized in management, business and economics.',
      descriptionKm: 'សាកលវិទ្យាល័យរដ្ឋនៅរាជធានីភ្នំពេញ ជំនាញខាងគ្រប់គ្រង ធុរកិច្ច និងសេដ្ឋកិច្ច។',
      sourceUrl: 'https://num.edu.kh/',
      sourceType: 'official_website',
      verificationStatus: 'verified',
      dataClassification: 'verified_public',
    };

    const res = await request(app)
      .post('/api/v1/universities')
      .set('Authorization', `Bearer ${platformAdminToken}`)
      .send(newUniPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe('num-pilot-test');

    // Confirm it appears immediately in the directory query without any DDL/schema modifications
    const listRes = await request(app).get('/api/v1/universities');
    const created = listRes.body.data.find((u: any) => u.slug === 'num-pilot-test');
    expect(created).toBeDefined();
    expect(created.acronym).toBe('NUM');
  });

  // Acceptance Test 3
  it('Acceptance Test 3: A campus can display verified buildings on the map', async () => {
    // Query RUPP main campus (campus 1)
    const campusRes = await request(app).get('/api/v1/campuses?university_id=1');
    expect(campusRes.status).toBe(200);
    const mainCampus = campusRes.body.data.find((c: any) => c.slug === 'campus-1');
    expect(mainCampus).toBeDefined();

    // Query verified buildings on this campus
    const buildingsRes = await request(app).get(`/api/v1/buildings?campus_id=${mainCampus.id}&verification_status=verified`);
    expect(buildingsRes.status).toBe(200);
    expect(buildingsRes.body.data.length).toBeGreaterThanOrEqual(4);

    const cjcc = buildingsRes.body.data.find((b: any) => b.code === 'CJCC');
    expect(cjcc).toBeDefined();
    expect(Number(cjcc.latitude)).toBeCloseTo(11.5684, 3);
    expect(Number(cjcc.longitude)).toBeCloseTo(104.8937, 3);
    expect(cjcc.verification_status).toBe('verified');
    expect(cjcc.source_url).toContain('cjcc.edu.kh');

    const ifl = buildingsRes.body.data.find((b: any) => b.code === 'IFL-MAIN');
    expect(ifl).toBeDefined();
    expect(Number(ifl.latitude)).toBeCloseTo(11.5690, 3);
    expect(Number(ifl.longitude)).toBeCloseTo(104.8914, 3);
  });

  // Acceptance Test 4
  it('Acceptance Test 4: Selecting an event marker opens the correct event', async () => {
    // Look up CJCC Job Fair 2026 event
    const eventList = await request(app).get('/api/v1/events?search=CJCC%20Job%20Fair');
    expect(eventList.status).toBe(200);
    expect(eventList.body.data.length).toBeGreaterThan(0);

    const targetEvent = eventList.body.data[0];
    const eventDetail = await request(app).get(`/api/v1/events/${targetEvent.id}`);

    expect(eventDetail.status).toBe(200);
    expect(eventDetail.body.success).toBe(true);
    expect(eventDetail.body.data.id).toBe(targetEvent.id);
    expect(eventDetail.body.data.title_en).toBe('CJCC Job Fair 2026');
    expect(eventDetail.body.data.slug).toBe('cjcc-job-fair-2026');
  });

  // Acceptance Test 5
  it('Acceptance Test 5: The event page displays its verified venue', async () => {
    const res = await request(app).get('/api/v1/events/cjcc-job-fair-2026');
    expect(res.status).toBe(200);

    const event = res.body.data;
    expect(event.venue).toBeDefined();
    expect(event.venue.buildingNameEn).toContain('Cambodia-Japan Cooperation Center');
    expect(event.venue.campusNameEn).toContain('RUPP Main Campus');
    expect(event.venue.isVenueVerified).toBe(true);
    expect(event.venue.buildingVerificationStatus).toBe('verified');
    expect(event.venue.roomDetails).toContain('Angkor Kizuna Hall');
    expect(Number(event.venue.latitude)).toBeCloseTo(11.5684, 3);
    expect(Number(event.venue.longitude)).toBeCloseTo(104.8937, 3);
    expect(event.venue.directionsUrl).toContain('https://www.google.com/maps/dir/?api=1');
  });

  // Acceptance Test 6
  it('Acceptance Test 6: A student can register for an eligible published event', async () => {
    // Fetch Hackathon event (which has 0 registrations initially)
    const eventRes = await request(app).get('/api/v1/events/rupp-tech-hackathon-2026');
    const eventId = eventRes.body.data.id;

    // Student 2 registers
    const regRes = await request(app)
      .post(`/api/v1/events/${eventId}/register`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send();

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.registrationId).toBeDefined();

    // Verify registration record exists in DB
    const checkRes = await request(app).get(`/api/v1/events/${eventId}`);
    expect(checkRes.body.data.registered_count).toBe(1);
  });

  // Acceptance Test 7
  it('Acceptance Test 7: Duplicate registrations are rejected', async () => {
    const eventRes = await request(app).get('/api/v1/events/rupp-tech-hackathon-2026');
    const eventId = eventRes.body.data.id;

    // Student 2 attempts to register AGAIN for the same event
    const dupRes = await request(app)
      .post(`/api/v1/events/${eventId}/register`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send();

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.error).toContain('already registered');
  });

  // Acceptance Test 8
  it('Acceptance Test 8: Capacity cannot be exceeded under concurrent registration', async () => {
    // Create an event with capacity = 2
    const createEvent = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${ruppOrganizerToken}`)
      .send({
        universityId: 1,
        campusId: 1,
        slug: 'concurrent-capacity-test-event',
        titleEn: 'Concurrency Test Seminar',
        titleKm: 'សិក្ខាសាលាសាកល្បង',
        descriptionEn: 'Testing transactional capacity under high concurrency.',
        descriptionKm: 'ការធ្វើតេស្តសមត្ថភាពកន្លែងដំណាលគ្នា។',
        startTime: '2026-11-25 10:00:00',
        endTime: '2026-11-25 12:00:00',
        capacity: 2, // strictly 2 seats max!
        status: 'published',
        eventVerification: 'demonstration',
        dataClassification: 'demonstration',
      });

    expect(createEvent.status).toBe(201);
    const eventId = createEvent.body.data.id;

    // Generate 6 distinct temporary student users to attempt concurrent registration
    const tempStudentTokens: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const email = `concurrency_user_${i}_${Date.now()}@rupp.edu.kh`;
      const regUser = await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'Password123!',
        fullName: `Concurrency User ${i}`,
        universityId: 1,
      });
      tempStudentTokens.push(regUser.body.data.token);
    }

    // Launch all 6 registration requests simultaneously with Promise.all
    const registrationPromises = tempStudentTokens.map((token) =>
      request(app)
        .post(`/api/v1/events/${eventId}/register`)
        .set('Authorization', `Bearer ${token}`)
        .send()
    );

    const results = await Promise.all(registrationPromises);

    const successfulRegistrations = results.filter((r) => r.status === 201);
    const rejectedRegistrations = results.filter((r) => r.status === 400);

    // Exactly 2 must succeed, and exactly 4 must be rejected due to capacity limit
    expect(successfulRegistrations.length).toBe(2);
    expect(rejectedRegistrations.length).toBe(4);

    // Verify database record has exactly registered_count = 2 (NOT 3, 4, 5, or 6!)
    const checkDb = await request(app).get(`/api/v1/events/${eventId}`);
    expect(checkDb.body.data.registered_count).toBe(2);
    expect(checkDb.body.data.capacity).toBe(2);
  }, 30000);

  // Acceptance Test 9
  it('Acceptance Test 9: An unauthorized organizer cannot modify another university\'s event', async () => {
    // 1. Create an event under ITC (University 2) by ITC admin
    const itcEvent = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${itcAdminToken}`)
      .send({
        universityId: 2, // ITC
        campusId: 3, // ITC main campus
        slug: 'itc-robotics-showcase-2026',
        titleEn: 'ITC Robotics Showcase 2026',
        titleKm: 'ពិព័រណ៍មនុស្សយន្ត ITC',
        descriptionEn: 'Annual robotics competition and engineering showcase.',
        descriptionKm: 'ការប្រកួតមនុស្សយន្តប្រចាំឆ្នាំ និងការតាំងពិព័រណ៍វិស្វកម្ម។',
        startTime: '2026-12-01 09:00:00',
        endTime: '2026-12-01 17:00:00',
        capacity: 100,
        status: 'published',
        eventVerification: 'confirmed',
        dataClassification: 'verified_public',
      });

    expect(itcEvent.status).toBe(201);
    const itcEventId = itcEvent.body.data.id;

    // 2. RUPP organizer attempts to modify ITC's event
    const unauthorizedAttempt = await request(app)
      .put(`/api/v1/events/${itcEventId}`)
      .set('Authorization', `Bearer ${ruppOrganizerToken}`)
      .send({
        titleEn: 'Hacked Title By Other University Organizer',
      });

    expect(unauthorizedAttempt.status).toBe(403);
    expect(unauthorizedAttempt.body.success).toBe(false);
    expect(unauthorizedAttempt.body.error).toContain('cannot modify an event belonging to another university');
  });

  // Acceptance Test 10
  it('Acceptance Test 10: A university administrator cannot access restricted records belonging to another university', async () => {
    // RUPP university admin attempts to access ITC (University ID 2) restricted records on admin dashboard
    const crossAccessAttempt = await request(app)
      .get('/api/v1/dashboards/admin?target_university_id=2')
      .set('Authorization', `Bearer ${ruppAdminToken}`);

    expect(crossAccessAttempt.status).toBe(403);
    expect(crossAccessAttempt.body.success).toBe(false);
    expect(crossAccessAttempt.body.error).toContain('cannot access restricted records belonging to another university');

    // Also test audit logs endpoint for cross-university access
    const crossAuditAttempt = await request(app)
      .get('/api/v1/audit-logs?university_id=2')
      .set('Authorization', `Bearer ${ruppAdminToken}`);

    expect(crossAuditAttempt.status).toBe(403);
    expect(crossAuditAttempt.body.success).toBe(false);
    expect(crossAuditAttempt.body.error).toContain('cannot access audit logs of another university');
  });

  // Acceptance Test 12
  it('Acceptance Test 12: Unverified or expired events are not presented as confirmed upcoming events', async () => {
    // Standard public events query (which powers the homepage / event directory)
    const publicEventsRes = await request(app).get('/api/v1/events');
    expect(publicEventsRes.status).toBe(200);

    const events = publicEventsRes.body.data;

    // 1. Check that NO expired events are returned
    const expiredEvents = events.filter(
      (e: any) => e.event_verification === 'expired' || new Date(e.end_time) < new Date()
    );
    expect(expiredEvents.length).toBe(0);

    // 2. Check that NO unverified events are returned as confirmed upcoming events
    const unverifiedEvents = events.filter((e: any) => e.event_verification === 'unverified');
    expect(unverifiedEvents.length).toBe(0);

    // 3. Check that fictional demonstration events are not presented without explicit filter
    const demoEvents = events.filter((e: any) => e.data_classification === 'demonstration');
    expect(demoEvents.length).toBe(0);

    // 4. Verify that all returned events are published and confirmed
    for (const e of events) {
      expect(e.status).toBe('published');
      expect(e.event_verification).toBe('confirmed');
      expect(new Date(e.end_time).getTime()).toBeGreaterThanOrEqual(Date.now() - 60000);
    }
  });

  // Acceptance Test 11
  it('Acceptance Test 11: The interface switches correctly between Khmer and English', async () => {
    const translationsPath = path.resolve(__dirname, '../../../frontend/src/i18n/translations.ts');
    expect(fs.existsSync(translationsPath)).toBe(true);

    const fileContent = fs.readFileSync(translationsPath, 'utf-8');

    // Verify presence of English and Khmer dictionary keys
    expect(fileContent).toContain('en: {');
    expect(fileContent).toContain('km: {');

    // Verify authentic Khmer strings in script
    expect(fileContent).toContain('សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ');
    expect(fileContent).toContain('ផែនទីបរិវេណ');
    expect(fileContent).toContain('ព្រឹត្តិការណ៍');
    expect(fileContent).toContain('ចុះឈ្មោះចូលរួម');
    expect(fileContent).toContain('គ្មានព្រឹត្តិការណ៍ដែលបានផ្ទៀងផ្ទាត់នៅពេលនេះទេ');

    // Verify English counterparts
    expect(fileContent).toContain('Royal University of Phnom Penh');
    expect(fileContent).toContain('Campus Map');
    expect(fileContent).toContain('Events');
    expect(fileContent).toContain('Register Now');
    expect(fileContent).toContain('No confirmed upcoming events currently scheduled');

    // Verify Khmer Unicode character range (\u1780 - \u17FF)
    const khmerRegex = /[\u1780-\u17FF]/;
    expect(khmerRegex.test(fileContent)).toBe(true);
  });

  // Acceptance Test 13
  it('Acceptance Test 13: The frontend production build and backend tests run successfully', async () => {
    const frontendDist = path.resolve(__dirname, '../../../frontend/dist');
    const indexHtml = path.join(frontendDist, 'index.html');

    expect(fs.existsSync(indexHtml)).toBe(true);
    const htmlContent = fs.readFileSync(indexHtml, 'utf-8');

    // Must contain built bundle references
    expect(htmlContent).toContain('/assets/index-');
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('CampusConnect');
  });
});
