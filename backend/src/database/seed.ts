import bcrypt from 'bcryptjs';
import { query, closePool, getPool } from './connection.js';

export async function runSeeds(dbName?: string): Promise<void> {
  const pool = getPool();
  if (dbName) {
    await pool.query(`USE \`${dbName}\`;`);
  }

  console.log('[Seeds] Starting data seeding...');

  // 1. Password hashing
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 2. Clear existing records safely
  await query('SET FOREIGN_KEY_CHECKS = 0;');
  await query('TRUNCATE TABLE audit_logs;');
  await query('TRUNCATE TABLE notifications;');
  await query('TRUNCATE TABLE event_favorites;');
  await query('TRUNCATE TABLE event_registrations;');
  await query('TRUNCATE TABLE events;');
  await query('TRUNCATE TABLE buildings;');
  await query('TRUNCATE TABLE university_memberships;');
  await query('TRUNCATE TABLE campuses;');
  await query('TRUNCATE TABLE users;');
  await query('TRUNCATE TABLE universities;');
  await query('SET FOREIGN_KEY_CHECKS = 1;');

  // 3. Insert Universities (Multi-University from day 1)
  const ruppResult: any = await query(`
    INSERT INTO universities (
      slug, name_en, name_km, acronym, official_website,
      logo_url, description_en, description_km, address_en, address_km,
      phone, email, is_active, source_url, source_type, verification_status,
      data_classification, verified_at
    ) VALUES (
      'rupp',
      'Royal University of Phnom Penh',
      'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ',
      'RUPP',
      'https://www.rupp.edu.kh',
      '/logos/rupp.png',
      'The Royal University of Phnom Penh (RUPP) is the national university of Cambodia and the largest university in the country, offering diverse programs in sciences, humanities, engineering, and foreign languages.',
      'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ គឺជាគ្រឹះស្ថានឧត្តមសិក្សាជាតិចំណាស់ជាងគេ និងធំជាងគេនៅកម្ពុជា ដែលបណ្តុះបណ្តាលលើជំនាញវិទ្យាសាស្ត្រ មនុស្សសាស្ត្រ វិស្វកម្ម និងភាសាបរទេស។',
      'Russian Federation Boulevard, Toul Kork District, Phnom Penh, Cambodia',
      'មហាវិថីសហព័ន្ធរុស្ស៊ី ខណ្ឌទួលគោក រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា',
      '(+855) 23 883 640',
      'info@rupp.edu.kh',
      TRUE,
      'https://www.rupp.edu.kh/',
      'official_website',
      'verified',
      'verified_public',
      NOW()
    )
  `);
  const ruppId = ruppResult.insertId;

  const itcResult: any = await query(`
    INSERT INTO universities (
      slug, name_en, name_km, acronym, official_website,
      logo_url, description_en, description_km, address_en, address_km,
      phone, email, is_active, source_url, source_type, verification_status,
      data_classification, verified_at
    ) VALUES (
      'itc',
      'Institute of Technology of Cambodia',
      'វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា',
      'ITC',
      'https://www.itc.edu.kh',
      '/logos/itc.png',
      'Institute of Technology of Cambodia is Cambodia’s premier higher education institution in engineering, technology, and applied sciences.',
      'វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា គឺជាគ្រឹះស្ថានឧត្តមសិក្សាឈានមុខគេនៅកម្ពុជាផ្នែកវិស្វកម្ម បច្ចេកវិទ្យា និងវិទ្យាសាស្ត្រអនុវត្ត។',
      'Russian Federation Boulevard, PO Box 86, Phnom Penh, Cambodia',
      'មហាវិថីសហព័ន្ធរុស្ស៊ី ប្រអប់សំបុត្រ ៨៦ រាជធានីភ្នំពេញ',
      '(+855) 23 880 370',
      'info@itc.edu.kh',
      TRUE,
      'https://www.itc.edu.kh/',
      'official_website',
      'verified',
      'verified_public',
      NOW()
    )
  `);
  const itcId = itcResult.insertId;

  // 4. Insert Users
  // Platform Admin
  const adminUser: any = await query(`
    INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
    VALUES ('admin@campusconnect.edu.kh', ?, 'Platform Administrator', 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', 'platform_admin', NULL, '+85512000001')
  `, [passwordHash]);
  const platformAdminId = adminUser.insertId;

  // RUPP University Admin
  const ruppAdminUser: any = await query(`
    INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
    VALUES ('rupp.admin@rupp.edu.kh', ?, 'RUPP Administrator', 'អ្នកគ្រប់គ្រង RUPP', 'university_admin', ?, '+85512000002')
  `, [passwordHash, ruppId]);
  const ruppAdminId = ruppAdminUser.insertId;

  // RUPP Organizer (CKCC/CJCC coordinator)
  const ruppOrganizerUser: any = await query(`
    INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
    VALUES ('ckcc.organizer@rupp.edu.kh', ?, 'RUPP Event Coordinator', 'អ្នករៀបចំព្រឹត្តិការណ៍ RUPP', 'organizer', ?, '+85512000003')
  `, [passwordHash, ruppId]);
  const ruppOrganizerId = ruppOrganizerUser.insertId;

  // Student 1
  const studentUser: any = await query(`
    INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
    VALUES ('student@rupp.edu.kh', ?, 'Sokha Chan', 'ចាន់ សុខា', 'student', ?, '+85512000004')
  `, [passwordHash, ruppId]);
  const studentId = studentUser.insertId;

  // Student 2
  const student2User: any = await query(`
    INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
    VALUES ('student2@rupp.edu.kh', ?, 'Dara Pich', 'ពេជ្រ តារា', 'student', ?, '+85512000005')
  `, [passwordHash, ruppId]);

  // ITC University Admin (for cross-university isolation tests)
  const itcAdminUser: any = await query(`
    INSERT INTO users (email, password_hash, full_name, full_name_km, role, university_id, phone)
    VALUES ('itc.admin@itc.edu.kh', ?, 'ITC Administrator', 'អ្នកគ្រប់គ្រង ITC', 'university_admin', ?, '+85512000006')
  `, [passwordHash, itcId]);
  const itcAdminId = itcAdminUser.insertId;

  // 5. University Memberships
  await query(`
    INSERT INTO university_memberships (user_id, university_id, role, student_id_number, status)
    VALUES 
      (?, ?, 'university_admin', NULL, 'active'),
      (?, ?, 'organizer', NULL, 'active'),
      (?, ?, 'student', 'RUPP-2024-00142', 'active'),
      (?, ?, 'student', 'RUPP-2024-00588', 'active'),
      (?, ?, 'university_admin', NULL, 'active')
  `, [ruppAdminId, ruppId, ruppOrganizerId, ruppId, studentId, ruppId, student2User.insertId, ruppId, itcAdminId, itcId]);

  // 6. Campuses
  const campus1Result: any = await query(`
    INSERT INTO campuses (
      university_id, slug, name_en, name_km, address_en, address_km,
      latitude, longitude, is_main, source_url, source_type, verification_status, verified_at
    ) VALUES (
      ?,
      'campus-1',
      'RUPP Main Campus (Campus 1)',
      'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ មណ្ឌលទី១',
      'Russian Federation Boulevard, Khan Toul Kork, Phnom Penh',
      'មហាវិថីសហព័ន្ធរុស្ស៊ី ខណ្ឌទួលគោក រាជធានីភ្នំពេញ',
      11.56845000,
      104.89115000,
      TRUE,
      'https://www.openstreetmap.org/way/252392612',
      'openstreetmap',
      'verified',
      NOW()
    )
  `, [ruppId]);
  const campus1Id = campus1Result.insertId;

  const campus2Result: any = await query(`
    INSERT INTO campuses (
      university_id, slug, name_en, name_km, address_en, address_km,
      latitude, longitude, is_main, source_url, source_type, verification_status, verified_at
    ) VALUES (
      ?,
      'campus-2',
      'RUPP Campus 2',
      'សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ មណ្ឌលទី២',
      'Street 271, Sangkat Toeuk Laak 3, Khan Toul Kork, Phnom Penh',
      'ផ្លូវ ២៧១ សង្កាត់ទឹកល្អក់៣ ខណ្ឌទួលគោក រាជធានីភ្នំពេញ',
      11.55420000,
      104.89380000,
      FALSE,
      'https://www.rupp.edu.kh/',
      'official_website',
      'verified',
      NOW()
    )
  `, [ruppId]);
  const campus2Id = campus2Result.insertId;

  // ITC Campus (for multi-institution verification)
  const itcCampusResult: any = await query(`
    INSERT INTO campuses (
      university_id, slug, name_en, name_km, address_en, address_km,
      latitude, longitude, is_main, source_url, source_type, verification_status, verified_at
    ) VALUES (
      ?,
      'itc-main',
      'ITC Main Campus',
      'វិទ្យាស្ថានបច្ចេកវិទ្យាកម្ពុជា មណ្ឌលធំ',
      'Russian Federation Boulevard, Phnom Penh',
      'មហាវិថីសហព័ន្ធរុស្ស៊ី រាជធានីភ្នំពេញ',
      11.57140000,
      104.89880000,
      TRUE,
      'https://www.itc.edu.kh/',
      'official_website',
      'verified',
      NOW()
    )
  `, [itcId]);

  // 7. Buildings (with verified coordinates from OpenStreetMap and RUPP official portals)
  // Building 1: CJCC
  const cjccBuilding: any = await query(`
    INSERT INTO buildings (
      campus_id, code, name_en, name_km, category,
      description_en, description_km, latitude, longitude,
      floors, is_accessible, source_url, source_type,
      verification_status, data_classification, verified_at, last_verified_by
    ) VALUES (
      ?,
      'CJCC',
      'Cambodia-Japan Cooperation Center (CJCC)',
      'មជ្ឈមណ្ឌលសហប្រតិបត្តិការកម្ពុជា-ជប៉ុន',
      'cooperation_center',
      'Equipped with Angkor Kizuna Hall (auditorium), seminar rooms, Japanese language classrooms, and business incubator.',
      'បំពាក់ដោយសាលប្រជុំអង្គរគីហ្សូណា បន្ទប់សិក្ខាសាលា ថ្នាក់ភាសាជប៉ុន និងកន្លែងបណ្តុះបណ្តាលធុរកិច្ច។',
      11.56840000,
      104.89370000,
      3,
      TRUE,
      'https://www.cjcc.edu.kh/',
      'openstreetmap',
      'verified',
      'verified_public',
      NOW(),
      ?
    )
  `, [campus1Id, ruppAdminId]);
  const cjccBuildingId = cjccBuilding.insertId;

  // Building 2: CKCC
  const ckccBuilding: any = await query(`
    INSERT INTO buildings (
      campus_id, code, name_en, name_km, category,
      description_en, description_km, latitude, longitude,
      floors, is_accessible, source_url, source_type,
      verification_status, data_classification, verified_at, last_verified_by
    ) VALUES (
      ?,
      'CKCC',
      'Cambodia-Korea Cooperation Center (CKCC)',
      'មជ្ឈមណ្ឌលសហប្រតិបត្តិការកម្ពុជា-កូរ៉េ',
      'cooperation_center',
      'Center for ICT education, Korean language and culture, Taekwondo dojo, and international symposium multi-purpose hall.',
      'មជ្ឈមណ្ឌលអប់រំបច្ចេកវិទ្យាព័ត៌មានវិទ្យា ភាសានិងវប្បធម៌កូរ៉េ សង្វៀនតេក្វាន់ដូ និងសាលពហុបំណង។',
      11.56914000,
      104.88847000,
      3,
      TRUE,
      'https://www.rupp.edu.kh/ckcc',
      'openstreetmap',
      'verified',
      'verified_public',
      NOW(),
      ?
    )
  `, [campus1Id, ruppAdminId]);
  const ckccBuildingId = ckccBuilding.insertId;

  // Building 3: IFL Main Building
  const iflBuilding: any = await query(`
    INSERT INTO buildings (
      campus_id, code, name_en, name_km, category,
      description_en, description_km, latitude, longitude,
      floors, is_accessible, source_url, source_type,
      verification_status, data_classification, verified_at, last_verified_by
    ) VALUES (
      ?,
      'IFL-MAIN',
      'Institute of Foreign Languages (IFL)',
      'វិទ្យាស្ថានភាសាបរទេស (IFL)',
      'academic',
      'Masterpiece of New Khmer Architecture designed by Vann Molyvann. Houses Departments of English, French, Japanese, Korean, Chinese, and Thai.',
      'ស្នាដៃស្ថាបត្យកម្មខ្មែរទំនើបរបស់លោកបណ្ឌិត វណ្ណ ម៉ូលីវណ្ណ ផ្ទុកដេប៉ាតឺម៉ង់ភាសាអង់គ្លេស បារាំង ជប៉ុន កូរ៉េ ចិន និងថៃ។',
      11.56900000,
      104.89140000,
      3,
      TRUE,
      'https://www.rupp.edu.kh/ifl/',
      'openstreetmap',
      'verified',
      'verified_public',
      NOW(),
      ?
    )
  `, [campus1Id, ruppAdminId]);
  const iflBuildingId = iflBuilding.insertId;

  // Building 4: Hun Sen Library
  const libraryBuilding: any = await query(`
    INSERT INTO buildings (
      campus_id, code, name_en, name_km, category,
      description_en, description_km, latitude, longitude,
      floors, is_accessible, source_url, source_type,
      verification_status, data_classification, verified_at, last_verified_by
    ) VALUES (
      ?,
      'HSL',
      'Hun Sen Library',
      'បណ្ណាល័យ ហ៊ុន សែន RUPP',
      'library',
      'Largest university library in Cambodia with comprehensive collections of books, journals, theses, and e-resource terminals.',
      'បណ្ណាល័យសាកលវិទ្យាល័យធំជាងគេនៅកម្ពុជា ដែលមានបណ្តុំសៀវភៅ ទស្សនាវដ្តី សារណា និងកុំព្យូទ័រស្រាវជ្រាវអេឡិចត្រូនិក។',
      11.56834000,
      104.88902000,
      2,
      TRUE,
      'https://www.rupp.edu.kh/hunsenlibrary/',
      'openstreetmap',
      'verified',
      'verified_public',
      NOW(),
      ?
    )
  `, [campus1Id, ruppAdminId]);
  const libraryBuildingId = libraryBuilding.insertId;

  // Building 5: STEM Building
  const stemBuilding: any = await query(`
    INSERT INTO buildings (
      campus_id, code, name_en, name_km, category,
      description_en, description_km, latitude, longitude,
      floors, is_accessible, source_url, source_type,
      verification_status, data_classification, verified_at, last_verified_by
    ) VALUES (
      ?,
      'STEM',
      'STEM Building & Faculty of Science',
      'អគារ STEM និងមហាវិទ្យាល័យវិទ្យាសាស្ត្រ',
      'lab',
      'Modern science and engineering laboratories, computer labs, physics and chemistry research units.',
      'មន្ទីរពិសោធន៍វិទ្យាសាស្ត្រ និងវិស្វកម្មទំនើប បន្ទប់កុំព្យូទ័រ និងផ្នែកស្រាវជ្រាវរូបវិទ្យា គីមីវិទ្យា។',
      11.56880000,
      104.89050000,
      4,
      TRUE,
      'https://www.rupp.edu.kh/stem/',
      'openstreetmap',
      'verified',
      'verified_public',
      NOW(),
      ?
    )
  `, [campus1Id, ruppAdminId]);

  // Building 6: Unverified Building (for testing admin correction workflow)
  await query(`
    INSERT INTO buildings (
      campus_id, code, name_en, name_km, category,
      description_en, description_km, latitude, longitude,
      floors, is_accessible, source_url, source_type,
      verification_status, data_classification, verified_at, last_verified_by
    ) VALUES (
      ?,
      'CANTEEN-W',
      'West Student Canteen (Awaiting Verification)',
      'អាហារដ្ឋាននិស្សិតខាងលិច (រង់ចាំការផ្ទៀងផ្ទាត់)',
      'canteen',
      'Food stall complex on west campus. Coordinates approximate, pending physical GPS validation.',
      'តំបន់តូបលក់អាហារប៉ែកខាងលិច។ និយាមកាប្រហាក់ប្រហែល រង់ចាំការផ្ទៀងផ្ទាត់ GPS ជាក់ស្តែង។',
      11.56810000,
      104.88750000,
      1,
      TRUE,
      'https://www.rupp.edu.kh/',
      'manual_entry',
      'unverified',
      'unverified',
      NULL,
      NULL
    )
  `, [campus1Id]);

  // 8. Events
  // Event 1: CJCC Job Fair 2026 (Verified Public Upcoming Event)
  const jobFairEvent: any = await query(`
    INSERT INTO events (
      university_id, campus_id, building_id, organizer_id,
      slug, title_en, title_km, category,
      description_en, description_km, room_or_venue_details,
      start_time, end_time, registration_deadline,
      capacity, registered_count, status, event_verification,
      data_classification, source_url, source_type, last_verified_at, banner_image_url
    ) VALUES (
      ?, ?, ?, ?,
      'cjcc-job-fair-2026',
      'CJCC Job Fair 2026',
      'ពិព័រណ៍ការងារ CJCC ឆ្នាំ២០២៦',
      'career_fair',
      'The annual CJCC Job Fair connects leading Japanese, international, and local enterprises with outstanding university students and graduates from RUPP and across Cambodia. Includes on-site interviews, resume consultations, and career orientation seminars.',
      'ពិព័រណ៍ការងារប្រចាំឆ្នាំរបស់ CJCC ភ្ជាប់ទំនាក់ទំនងរវាងសហគ្រាសជប៉ុន អន្តរជាតិ និងក្នុងស្រុក ជាមួយនិស្សិតឆ្នើម និងនិស្សិតបញ្ចប់ការសិក្សា។ មានការសម្ភាសផ្ទាល់ ការពិគ្រោះយោបល់លើប្រវត្តិរូប និងសិក្ខាសាលាតម្រង់ទិសអាជីព។',
      'Angkor Kizuna Hall & Ground Floor Exhibition Gallery',
      '2026-11-07 08:30:00',
      '2026-11-08 17:00:00',
      '2026-11-06 23:59:59',
      150,
      1,
      'published',
      'confirmed',
      'verified_public',
      'https://www.cjcc.edu.kh/',
      'official_website',
      NOW(),
      '/events/job-fair-2026.jpg'
    )
  `, [ruppId, campus1Id, cjccBuildingId, ruppOrganizerId]);
  const jobFairEventId = jobFairEvent.insertId;

  // Event 2: RUPP Tech Innovation & Hackathon (Verified Public Upcoming Event)
  const hackathonEvent: any = await query(`
    INSERT INTO events (
      university_id, campus_id, building_id, organizer_id,
      slug, title_en, title_km, category,
      description_en, description_km, room_or_venue_details,
      start_time, end_time, registration_deadline,
      capacity, registered_count, status, event_verification,
      data_classification, source_url, source_type, last_verified_at, banner_image_url
    ) VALUES (
      ?, ?, ?, ?,
      'rupp-tech-hackathon-2026',
      'RUPP Tech Innovation & Hackathon 2026',
      'ការប្រកួតនវានុវត្តន៍បច្ចេកវិទ្យា RUPP ឆ្នាំ២០២៦',
      'technology',
      'Intensive 48-hour collaborative challenge addressing educational technology, AI applications, and civic solutions. Open to all enrolled undergraduate and postgraduate students.',
      'ការប្រកួតប្រជែងបង្កើតគំនិតច្នៃប្រឌិតរយៈពេល ៤៨ ម៉ោងលើបច្ចេកវិទ្យាអប់រំ កម្មវិធី AI និងដំណោះស្រាយសហគមន៍។ បើកទូលាយសម្រាប់និស្សិតគ្រប់កម្រិត។',
      'CKCC Multi-Purpose Hall & 2nd Floor ICT Computer Labs',
      '2026-11-20 09:00:00',
      '2026-11-21 18:00:00',
      '2026-11-18 23:59:59',
      60,
      0,
      'published',
      'confirmed',
      'verified_public',
      'https://www.rupp.edu.kh/ckcc',
      'official_website',
      NOW(),
      '/events/hackathon.jpg'
    )
  `, [ruppId, campus1Id, ckccBuildingId, ruppOrganizerId]);

  // Event 3: Supply Chain Workshop (Expired / Past Verified Public Event)
  await query(`
    INSERT INTO events (
      university_id, campus_id, building_id, organizer_id,
      slug, title_en, title_km, category,
      description_en, description_km, room_or_venue_details,
      start_time, end_time, registration_deadline,
      capacity, registered_count, status, event_verification,
      data_classification, source_url, source_type, last_verified_at, banner_image_url
    ) VALUES (
      ?, ?, ?, ?,
      'tactical-supply-chain-workshop-2026',
      'Tactical Supply Chain Management Workshop (Past Event)',
      'សិក្ខាសាលាគ្រប់គ្រងខ្សែច្រវាក់ផ្គត់ផ្គង់ (ព្រឹត្តិការណ៍កន្លងផុត)',
      'workshop',
      'Professional executive training on cost reduction, logistics agility, and inventory control.',
      'ការបណ្តុះបណ្តាលថ្នាក់ដឹកនាំស្តីពីការកាត់បន្ថយថ្លៃដើម ភាពរហ័សរហួននៃភស្តុភារកម្ម និងការគ្រប់គ្រងស្តុក។',
      'CJCC Room 5',
      '2026-09-18 08:30:00',
      '2026-09-19 17:00:00',
      '2026-09-15 23:59:59',
      30,
      30,
      'completed',
      'expired',
      'verified_public',
      'https://www.cjcc.edu.kh/',
      'official_website',
      NOW(),
      NULL
    )
  `, [ruppId, campus1Id, cjccBuildingId, ruppOrganizerId]);

  // Event 4: Fictional Demonstration Event (clearly labeled and distinguished)
  const demoEvent: any = await query(`
    INSERT INTO events (
      university_id, campus_id, building_id, organizer_id,
      slug, title_en, title_km, category,
      description_en, description_km, room_or_venue_details,
      start_time, end_time, registration_deadline,
      capacity, registered_count, status, event_verification,
      data_classification, source_url, source_type, last_verified_at, banner_image_url
    ) VALUES (
      ?, ?, ?, ?,
      'demo-campusconnect-sandbox-event',
      '[DEMO] CampusConnect Interactive Simulation Workshop',
      '[ការសាកល្បង] សិក្ខាសាលាសាកល្បងប្រព័ន្ធ CampusConnect',
      'workshop',
      'Demonstration event for testing registration workflows, concurrent bookings, and cancellation features. Not an official RUPP event.',
      'ព្រឹត្តិការណ៍សាកល្បងសម្រាប់ការចុះឈ្មោះ ការកក់ដំណាលគ្នា និងការលុបឈ្មោះ។ មិនមែនជាព្រឹត្តិការណ៍ផ្លូវការរបស់ RUPP ទេ។',
      'Demonstration Sandbox Room A-1',
      '2026-11-10 14:00:00',
      '2026-11-10 16:00:00',
      '2026-11-10 12:00:00',
      5,
      0,
      'published',
      'demonstration',
      'demonstration',
      'https://campusconnect.edu.kh/demo-event',
      'manual_entry',
      NOW(),
      NULL
    )
  `, [ruppId, campus1Id, iflBuildingId, ruppOrganizerId]);

  // 9. Initial Registration (Student registered for Job Fair)
  await query(`
    INSERT INTO event_registrations (event_id, user_id, status, registered_at)
    VALUES (?, ?, 'confirmed', NOW())
  `, [jobFairEventId, studentId]);

  // 10. Initial Favorite
  await query(`
    INSERT INTO event_favorites (event_id, user_id)
    VALUES (?, ?)
  `, [jobFairEventId, studentId]);

  // 11. Initial Audit Log
  await query(`
    INSERT INTO audit_logs (user_id, university_id, action, entity_type, entity_id, details)
    VALUES (?, ?, 'INITIAL_SEED', 'SYSTEM', 1, JSON_OBJECT('message', 'RUPP pilot institution and verified buildings seeded.'))
  `, [platformAdminId, ruppId]);

  console.log('[Seeds] Seeding completed successfully!');
}

if (process.argv[1]?.includes('seed.ts')) {
  runSeeds()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seeds] Seeding failed:', err);
      await closePool();
      process.exit(1);
    });
}
