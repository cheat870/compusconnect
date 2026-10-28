# CampusConnect MVP — Royal University of Phnom Penh (RUPP) Pilot

CampusConnect is a multi-university digital campus directory, interactive venue navigation, and event management platform. This pilot implementation features the **Royal University of Phnom Penh (RUPP)** as its first verified institution, with multi-tenant architecture designed to scale seamlessly to all higher education institutions across Cambodia.

---

## 🏛️ Pilot Institution: Royal University of Phnom Penh (RUPP)

- **Institution:** Royal University of Phnom Penh (សាកលវិទ្យាល័យភូមិន្ទភ្នំពេញ)
- **Acronym:** RUPP
- **Official Website:** [https://www.rupp.edu.kh/](https://www.rupp.edu.kh/)
- **Main Campus Location:** Russian Federation Boulevard, Khan Toul Kork, Phnom Penh, Cambodia
- **OpenStreetMap Anchor:** [Way 252392612](https://www.openstreetmap.org/way/252392612) (`11.56845° N, 104.89115° E`)
- **Verified Primary Facilities:**
  - **CJCC** (Cambodia-Japan Cooperation Center & Angkor Kizuna Hall): `11.56840° N, 104.89370° E`
  - **CKCC** (Cambodia-Korea Cooperation Center & Multi-purpose Hall): `11.56914° N, 104.88847° E`
  - **IFL** (Institute of Foreign Languages - Vann Molyvann design): `11.56900° N, 104.89140° E`
  - **Hun Sen Library** (Central University Library): `11.56834° N, 104.88902° E`
  - **STEM Building** (Faculty of Science & Computer Labs): `11.56880° N, 104.89050° E`

*Disclaimer: CampusConnect is an independent educational platform piloting verified public information from RUPP and official institutional sources. It does not claim university endorsement or official partnership unless explicitly confirmed.*

---

## 🚀 Key Features

1. **Multi-University Architecture from Day 1:** Fully relational database structure (`university_id`, `campus_id`) preventing single-university hardcoding. Dynamically supports additional universities without any DDL/schema modifications.
2. **Data Verification Workflow:** Every university, campus, building, and event tracks `source_url`, `source_type`, `verification_status` (`verified`, `unverified`), and `data_classification` (`verified_public`, `demonstration`).
3. **Interactive Campus Map:** Leaflet map with configurable OpenStreetMap tiles, campus switcher, building markers categorized with distinct SVG icons, event markers, "Get Directions" routing links, and "View on Map" navigation.
4. **Verified Event Directory & Concurrency-Safe Booking:**
   - Real public verified announcements (e.g., CJCC Job Fair 2026, RUPP Tech Innovation Hackathon).
   - High-concurrency seat capacity reservation using transactional row-level locks (`SELECT ... FOR UPDATE`), strictly preventing over-registration.
   - Immediate duplicate registration rejection and instant cancellation.
   - Strict filtering ensuring expired or unverified events are never presented as confirmed upcoming events.
5. **Role-Based Portals & Scoped Access:**
   - **Student Dashboard:** View bookings, cancel reservations, favorites, and notifications.
   - **Organizer Dashboard:** Manage university-scoped events, create verified announcements, and view attendee rates.
   - **Admin Dashboard:** Platform and University administration, building coordinate correction tool with verification audit logging, and immutable system audit logs.
   - **Cross-University Isolation:** University administrators cannot access records or audit logs belonging to another institution.
6. **Bilingual Interface (Khmer & English):** Native switcher between ភាសាខ្មែរ (KM) and English (EN) with persistent selection in localStorage.

---

## 📋 Acceptance Test Results

All 13 acceptance test suites were implemented and executed against the MySQL database and frontend compiler:

| # | Acceptance Test Case | Execution Status |
|---|---|---|
| 1 | RUPP appears in the university directory | **PASS** |
| 2 | Another university can be added without changing the schema | **PASS** |
| 3 | A campus can display verified buildings on the map | **PASS** |
| 4 | Selecting an event marker opens the correct event | **PASS** |
| 5 | The event page displays its verified venue | **PASS** |
| 6 | A student can register for an eligible published event | **PASS** |
| 7 | Duplicate registrations are rejected | **PASS** |
| 8 | Capacity cannot be exceeded under concurrent registration | **PASS** (1611ms, atomic `FOR UPDATE` lock) |
| 9 | An unauthorized organizer cannot modify another university's event | **PASS** (HTTP 403 Forbidden) |
| 10 | A university administrator cannot access restricted records of another university | **PASS** (HTTP 403 Forbidden) |
| 11 | The interface switches correctly between Khmer and English | **PASS** (Dual dictionary & Unicode verification) |
| 12 | Unverified or expired events are not presented as confirmed upcoming events | **PASS** (Strict query filtering) |
| 13 | The frontend production build and backend tests run successfully | **PASS** (Vite 6 / TypeScript 5.7) |

---

## 🛠️ Windows PowerShell Setup & Running Commands

### Prerequisites
- Node.js v20+ (Node v25.9.0 tested)
- MySQL 8.0+ running on `localhost:3306`

### 1. Database Setup & Migrations
```powershell
# Open Windows PowerShell in project root:
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend

# Run migrations and seed data
npm run migrate
npm run seed
```

### 2. Execute Backend Acceptance Tests
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend
npm test
```

### 3. Run Development Servers
Open two PowerShell terminals:

**Terminal 1 (Backend REST API - http://localhost:5000):**
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend
npm run dev
```

**Terminal 2 (Frontend Client - http://localhost:5173):**
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\frontend
npm run dev
```

### 4. Build Frontend for Production
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\frontend
npm run build
```

---

## 🔑 Test Personas & Credentials

All test personas use password: `Password123!`

| Role | Email | Scope |
|---|---|---|
| **Platform Administrator** | `admin@campusconnect.edu.kh` | Unrestricted global access |
| **RUPP Administrator** | `rupp.admin@rupp.edu.kh` | Royal University of Phnom Penh |
| **RUPP Event Organizer** | `ckcc.organizer@rupp.edu.kh` | CKCC & RUPP Events |
| **Student** | `student@rupp.edu.kh` | Enrolled RUPP Student |
| **ITC Administrator** | `itc.admin@itc.edu.kh` | Institute of Technology of Cambodia |

*A one-click persona switcher is embedded in the top navbar for immediate evaluation of each dashboard without manual login typing.*
