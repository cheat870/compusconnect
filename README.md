# CampusConnect v2.0 — Multi-University Campus Map & Events Platform
### Pilot Institution: Royal University of Phnom Penh (RUPP), Cambodia

CampusConnect is an enterprise-grade, Khmer-English multi-university digital campus directory, interactive venue navigation, event management platform, and role-based administrative portal. This v2.0 release features full multi-tenant architecture piloting the **Royal University of Phnom Penh (RUPP)**, real-time GPS positioning, secure authentication with database-backed session revocation, and a comprehensive 9-module Admin Dashboard.

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

## 🛡️ Secure Authentication & Role-Based Access Control (RBAC)

### 1. Multi-Tenant Role Hierarchy (5 Roles)
| Role | Access Level & Scope |
|---|---|
| **Visitor** | Public campus exploration, building directory, event discovery, search, Khmer/English switching. |
| **Student** | Event registration, booking cancellation, favorite bookmarks, personal profile editing, password security. Strictly assigned on public registration. |
| **Organizer** | Event draft publishing, campus venue booking, attendee roster export, event management. |
| **University Admin** | Institution-scoped administrative dashboard, event approval/rejection moderation, building coordinate verification, student user directory. Strictly isolated to their assigned `university_id`. |
| **Platform Admin** | Unrestricted global oversight across all universities, platform user directory, role assignments, system audit logs, account deactivation/activation. |

### 2. Authentication Architecture & Security
- **Registration Security:** Strict Zod schema validation (full name, email, min 8-character password with letters + numbers, matching confirmation). Public sign-up automatically defaults to `student` role; client-supplied privileged roles are strictly ignored.
- **Login Defense:** Generic authentication error messaging (`Invalid email or password`) to prevent email enumeration attacks. Rate limiting via `express-rate-limit` against brute-force attacks.
- **Dual Session Mechanism:** Sets secure `HttpOnly; SameSite=Lax` cookies (`campusconnect_token`) for browser clients, with simultaneous Bearer token support for API consumers and automated tests.
- **Session Revocation & Tracking:** Backed by database table `user_sessions`. Logout explicitly marks the active session as invalid in MySQL and clears the cookie. Session is immediately revoked upon account deactivation or password change.
- **Tenant Isolation:** Enforced both in middleware (`requireUniversityAccess`, `requireResourceOwnership`) and via parameter query scoping (`WHERE u.university_id = ?`). University administrators cannot view or mutate users or records belonging to another institution.
- **Profile & Password Management:**
  - `GET /api/v1/users/me` — Retrieve current authenticated profile.
  - `PATCH /api/v1/users/me` — Update full name (English & Khmer) and phone number.
  - `PATCH /api/v1/users/me/password` — Verify current password via `bcrypt.compare` before hashing and applying the new password. Invalidates previous sessions.

---

## 🎛️ Professional Admin Dashboard (9 Modules)

Accessable by University Admins (scoped to institution) and Platform Admins (global):

1. **System Overview & Real-Time Metrics:**
   - Real-time counts from MySQL: Total Users, Active Users (logged in within 30 days), Total Events, Pending Approvals, Total Facilities, Verified Facilities, Unverified Facilities, and Total Registrations.
2. **User Management Directory:**
   - Real-time searchable directory with role filter, pagination, role change modal (Platform Admin), and one-click account activation / deactivation.
3. **Roles & Permissions Matrix:**
   - Transparent tabular visual matrix illustrating feature capabilities across all 5 roles.
4. **Universities Overview:**
   - Multi-institution catalog displaying acronym, verification status, pilot badge, and contact metadata.
5. **Campus Buildings & GPS Coordinate Verification:**
   - Facility manager displaying verification status badges (`verified` / `unverified`). Administrators can update latitude/longitude coordinates directly from verified sources or delete outdated facilities.
6. **Events Moderation Queue:**
   - Moderation workflow with single-click Approval and Rejection modal requiring mandatory explanation stored in `events.rejection_reason`.
7. **Event Registrations Roster:**
   - Cross-event registration tracker displaying student name, email, event title, booking date, and confirmation status.
8. **System Audit Logs:**
   - Immutable security trail recording timestamp, admin user, target entity, action (`USER_ROLE_CHANGED`, `USER_ACTIVATED`, `EVENT_APPROVED`, `EVENT_REJECTED`, etc.), and client IP.
9. **Platform Settings:**
   - Configuration panel displaying environment, active database, token expiration, pilot institution version, and security parameters.

---

## 🗺️ Real-Time "My Current Location" GPS

- **Floating Map Control:** Dedicated "My Location" (`ទីតាំងរបស់ខ្ញុំ`) control with high-contrast active indicator.
- **Accurate Geolocation:** Utilizes the browser Geolocation API (`getCurrentPosition` & `watchPosition`) with accuracy circle rendering and auto-centering.
- **Follow My Location Mode:** Continuous live tracking toggle with graceful clean-up when disabled or unmounted.
- **Privacy-Preserving:** Coordinates are utilized strictly within local device memory for Leaflet map centering and are never transmitted to backend servers.
- **Graceful Error Handling:** Bilingual modal banners explaining permissions, timeouts, and device GPS availability.

---

## 📋 Comprehensive Automated Test Results (38 Tests Passing)

CampusConnect features a complete automated test suite run via Vitest against MySQL (`campusconnect_test`):

```
 Test Files  2 passed (2)
      Tests  38 passed (38)
```

### Acceptance Test Suite (`campusconnect.acceptance.test.ts` — 13 Tests)
| # | Acceptance Test Case | Status | Details |
|---|---|---|---|
| 1 | RUPP appears in university directory | **PASS** | Verifies slug, acronym, Khmer/English names, source URL |
| 2 | Add university without schema changes | **PASS** | Multi-tenant dynamic scaling verification |
| 3 | Campus displays verified buildings on map | **PASS** | Validates GeoJSON/coordinates and verification status |
| 4 | Selecting event marker opens correct event | **PASS** | Verifies event marker to detail page binding |
| 5 | Event page displays verified venue | **PASS** | Validates facility linkage and room details |
| 6 | Student registers for eligible event | **PASS** | Verifies 201 Created and registration row creation |
| 7 | Duplicate registrations rejected | **PASS** | Validates 409 Conflict rejection |
| 8 | Capacity not exceeded under concurrency | **PASS** | 6 parallel requests with atomic `SELECT ... FOR UPDATE` row lock |
| 9 | Unauthorized organizer cannot modify foreign event | **PASS** | HTTP 403 Forbidden tenant isolation |
| 10 | University admin cannot access foreign records | **PASS** | HTTP 403 Forbidden tenant isolation |
| 11 | Interface switches between Khmer and English | **PASS** | Dual dictionary & Unicode verification |
| 12 | Unverified or expired events not presented as confirmed | **PASS** | Strict query filtering logic |
| 13 | Frontend production build & backend tests pass | **PASS** | Vite 6 & TypeScript compilation |

### Auth, RBAC & Admin Test Suite (`auth_rbac.test.ts` — 25 Tests)
| # | Test Case | Status | Details |
|---|---|---|---|
| 1 | Public student registration with confirmation | **PASS** | Validates Zod schema and assigns student role |
| 2 | Privilege escalation prevention on public registration | **PASS** | Ignores client-supplied role: 'platform_admin' |
| 3 | Reject registration on password confirmation mismatch | **PASS** | HTTP 400 'Passwords do not match' |
| 4 | Reject registration on weak password (<8 chars / missing numbers) | **PASS** | HTTP 400 password strength validation |
| 5 | Reject duplicate email registration | **PASS** | HTTP 409 Conflict |
| 6 | Generic login error on non-existent email | **PASS** | HTTP 401 'Invalid email or password' |
| 7 | Generic login error on wrong password | **PASS** | HTTP 401 'Invalid email or password' (no enumeration) |
| 8 | HttpOnly SameSite=Lax cookie and `last_login_at` update | **PASS** | Security headers and active tracking |
| 9 | Retrieve authenticated profile `GET /api/v1/users/me` | **PASS** | Dual token / cookie authorization |
| 10 | Update user profile `PATCH /api/v1/users/me` | **PASS** | Full name (EN/KM) & phone update |
| 11 | Reject password change if current password incorrect | **PASS** | HTTP 401 current password bcrypt verification |
| 12 | Successfully change password with bcrypt verification | **PASS** | Old password fails, new password succeeds |
| 13 | Session invalidation in `user_sessions` upon logout | **PASS** | Revoked token returns HTTP 401 'Session revoked' |
| 14 | Block anonymous access to Admin endpoints | **PASS** | HTTP 401 Unauthorized |
| 15 | Block student access to Admin endpoints | **PASS** | HTTP 403 Forbidden |
| 16 | Block organizer access to Admin endpoints | **PASS** | HTTP 403 Forbidden |
| 17 | University Admin access to scoped dashboard | **PASS** | Metrics scoped to institution |
| 18 | University Admin user directory tenant isolation | **PASS** | Returns only institution users |
| 19 | University Admin cannot alter foreign university user | **PASS** | HTTP 403 Forbidden tenant isolation |
| 20 | Platform Admin views users across all universities | **PASS** | Global multi-institution access |
| 21 | Platform Admin modifies user roles with audit trail | **PASS** | Role change reflected in `audit_logs` |
| 22 | Platform Admin activates/deactivates accounts | **PASS** | Deactivated user blocked with HTTP 403 |
| 23 | Rejecting event requires non-empty rejection reason | **PASS** | HTTP 400 rejection reason mandatory |
| 24 | Rejecting event records reason in database | **PASS** | `rejection_reason` saved in `events` |
| 25 | Approving event updates status and clears rejection reason | **PASS** | `approval_status: 'approved'` |

---

## 🛠️ Windows PowerShell Setup & Running Commands

### Prerequisites
- Node.js v20+ (tested on Node v25.9.0)
- MySQL 8.0+ running on `localhost:3306`

### 1. Database Setup & Migrations
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend

# Execute migrations and seed initial RUPP pilot data:
npm run migrate
npm run seed
```

### 2. Secure First Platform Administrator Bootstrap
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend

# Run one-time secure initial admin setup (blocks unauthorized repeated runs):
npm run bootstrap:admin
```

### 3. Run Automated Tests
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\backend
npm test
```

### 4. Build Frontend for Production
```powershell
cd D:\Build_Project_With_Ai\Website_Ai\CampusConnect\frontend
npm run build
```

### 5. Run Development Servers
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
