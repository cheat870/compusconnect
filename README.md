# CampusConnect v2.0 — Multi-University Campus Map & Events Platform
### Pilot Institution: Royal University of Phnom Penh (RUPP), Cambodia

CampusConnect is a production-grade Khmer-English multi-university digital campus directory, interactive venue navigation, and event management platform. This v2.0 upgrade implements the complete pilot for the **Royal University of Phnom Penh (RUPP)** with multi-tenant architecture designed to scale seamlessly across all higher education institutions in Cambodia.

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
  - **RUPP Administrative Building**: `11.56820° N, 104.89020° E`
  - **Main Campus Parking Area**: `11.56780° N, 104.89200° E`

*Disclaimer: CampusConnect is an independent educational platform piloting verified public information from RUPP and official institutional sources. It does not claim university endorsement or official partnership unless explicitly confirmed.*

---

## 🚀 Key Features in V2.0

1. **Split-Screen Interactive Map (35% Sidebar / 65% Map):**
   - Left-hand facilities panel with real-time search, category filters (academic, library, cooperation center, lab, administrative, canteen, parking), verified facility count, and scrollable cards.
   - Main Leaflet / OpenStreetMap viewport with custom categorized SVG pin markers, venue popups, zoom controls (+/-/reset view).
   - **Bi-directional Focus Interaction:** Clicking any facility card centers the map on the marker and opens the popup; clicking any map marker highlights and smoothly scrolls the corresponding facility card into view.
   - Mobile-responsive collapsible facilities drawer.

2. **Institution Switcher in Header:**
   - Universal dropdown in the main navigation bar allowing seamless switching between institutions (e.g. RUPP, ITC) while maintaining institutional database scoping.

3. **Dedicated Facilities Directory (`/facilities`):**
   - Grid view of campus buildings with search, category filtering, verified badges, floor counts, GPS coordinates, external directions links, and direct "View on Map" navigation.

4. **Dedicated My Registrations Page (`/me/registrations`):**
   - Allows enrolled students to view their confirmed bookings, venue location details, Phnom Penh local timestamps, and direct "Cancel Registration" button.

5. **Organizer Attendee Rosters (`GET /api/v1/events/:id/attendees`):**
   - Organizers can view live attendee lists (student name, email, student ID, registration date) for their organized sessions.

6. **University Admin Event Approval Workflow (`PUT /api/v1/events/:id/approval`):**
   - Approval queue where campus administrators review pending event submissions, approving or rejecting with optional audit comments.

7. **Production Security Enhancements:**
   - `helmet` security headers.
   - Rate limiting via `express-rate-limit` on authentication endpoints (`/api/v1/auth/*`).
   - Secure password reset workflow (`/forgot-password`, `/reset-password`).
   - Strict role-based access control (Platform Admin, University Admin, Organizer, Student).

8. **Bilingual Khmer-English System (ភាសាខ្មែរ / English):**
   - Seamless one-click language toggle across all navigation menus, map cards, popups, and dashboard forms with persistent selection in localStorage.

---

## 📋 Acceptance Test Results

All 13 acceptance test suites are automated with Vitest and verified against the live MySQL database:

| # | Acceptance Test Case | Execution Status |
|---|---|---|
| 1 | RUPP appears in the university directory | **PASS** |
| 2 | Another university can be added without changing the schema | **PASS** |
| 3 | A campus can display verified buildings on the map | **PASS** |
| 4 | Selecting an event marker opens the correct event | **PASS** |
| 5 | The event page displays its verified venue | **PASS** |
| 6 | A student can register for an eligible published event | **PASS** |
| 7 | Duplicate registrations are rejected | **PASS** |
| 8 | Capacity cannot be exceeded under concurrent registration | **PASS** (Atomic `SELECT ... FOR UPDATE` row lock) |
| 9 | An unauthorized organizer cannot modify another university's event | **PASS** (HTTP 403 Forbidden) |
| 10 | A university administrator cannot access restricted records of another university | **PASS** (HTTP 403 Forbidden) |
| 11 | The interface switches correctly between Khmer and English | **PASS** (Dual dictionary & Unicode verification) |
| 12 | Unverified or expired events are not presented as confirmed upcoming events | **PASS** (Strict query filtering) |
| 13 | The frontend production build and backend tests run successfully | **PASS** (Vite 6 / TypeScript 5.7) |

---

## 🛠️ Windows PowerShell Setup & Running Commands

### Prerequisites
- Node.js v20+ (tested on Node v25.9.0)
- MySQL 8.0+ running on `localhost:3306`

### 1. Database Setup & Migrations
```powershell
# Open Windows PowerShell in backend directory:
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend

# Execute migrations and seed initial RUPP pilot data:
npm run migrate
npm run seed
```

### 2. Execute Backend Acceptance Tests
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend
npm test
```

### 3. Build Frontend for Production
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\frontend
npm run build
```

### 4. Run Development Servers
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

---

## 🔑 Test Personas & Credentials

All test accounts use password: `Password123!`

| Role | Email | Institution Scope |
|---|---|---|
| **Platform Administrator** | `admin@campusconnect.edu.kh` | Unrestricted global access |
| **RUPP Administrator** | `rupp.admin@rupp.edu.kh` | Royal University of Phnom Penh |
| **RUPP Event Organizer** | `ckcc.organizer@rupp.edu.kh` | CKCC & RUPP Events |
| **Student** | `student@rupp.edu.kh` | Enrolled RUPP Student |
| **ITC Administrator** | `itc.admin@itc.edu.kh` | Institute of Technology of Cambodia |

*A one-click persona switcher is embedded directly in the top navbar (`Personas` button) for instantaneous evaluation without manual login typing.*
