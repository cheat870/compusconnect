# CampusConnect MVP — Setup & Architecture Guide

## 1. Architecture Overview

CampusConnect is structured as a clean decoupled multi-tier web application:

```
CampusConnect/
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql       # 10 core tables with foreign keys & indexes
│   └── seeds/
│       └── 001_seed_rupp_pilot.sql      # Verified RUPP & ITC seed data
├── backend/
│   ├── src/
│   │   ├── config/                      # Environment variables & DB settings
│   │   ├── database/                    # Connection pool, migrate & seed runners
│   │   ├── middlewares/                 # JWT auth, role guard, university scoping, audit logging
│   │   ├── routes/                      # Universities, campuses, buildings, events, dashboards, audit
│   │   ├── __tests__/                   # 13 Acceptance test suites with Vitest & Supertest
│   │   ├── app.ts                       # Express application definition
│   │   └── server.ts                    # Server startup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/                  # Navbar, Footer, CampusMap (Leaflet), AuthModal
│   │   ├── context/                     # AuthContext with quick persona switcher
│   │   ├── i18n/                        # Bilingual translations (Khmer & English) & context
│   │   ├── pages/                       # Home, Universities, Campuses, Events, EventDetail, Dashboards
│   │   ├── services/                    # Axios API client
│   │   └── App.tsx                      # Root application & tab routing
│   ├── package.json
│   └── vite.config.ts
└── docs/
    └── SETUP_GUIDE.md
```

## 2. Multi-University Database Integrity

The database is built on MySQL 8.0 with InnoDB and `utf8mb4_unicode_ci` collation (native support for Khmer script):

- **University Scoping:** All resources (`campuses`, `buildings`, `events`, `audit_logs`) maintain relational foreign keys.
- **Venue Constraint:** An event's optional `building_id` venue must belong to the event's selected `campus_id`. This is validated both at database schema level and in the REST API controllers.
- **Strict Concurrency Lock:** High-load registrations execute inside `withTransaction()` utilizing `SELECT capacity, registered_count FROM events WHERE id = ? FOR UPDATE`. This row-level lock eliminates race conditions during simultaneous bookings.
- **Cross-University Isolation:** University Administrators can only read or edit records within their assigned `university_id`. Requests targeting another university receive HTTP 403 Forbidden.

## 3. Data Verification Workflow

- **University Profile:** Verified against the official RUPP portal ([https://www.rupp.edu.kh/](https://www.rupp.edu.kh/)).
- **Campuses & Buildings:** Geographic coordinates are obtained from verified OpenStreetMap datasets ([Way 252392612](https://www.openstreetmap.org/way/252392612)). Unverified facilities (such as preliminary canteen coordinates) are marked with `verification_status = 'unverified'` and can be updated by administrators via the Admin Dashboard.
- **Events Classification:**
  - `confirmed`: Verified public announcement from official channels.
  - `expired`: Concluded past events (retained for history, excluded from upcoming lists).
  - `demonstration`: Clearly labeled sandbox events for testing (excluded from public feeds).

## 4. Troubleshooting

### Port Conflicts
- **Backend (Port 5000):** If port 5000 is occupied, adjust `PORT` in `backend/.env`.
- **Frontend (Port 5173):** Vite automatically chooses the next open port (e.g. 5174) if 5173 is in use.

### MySQL Authentication
- Ensure the MySQL service (`MySQL80`) is running. Check with `Get-Service MySQL80` in PowerShell.
- Verify credentials in `backend/.env`: `DB_USER=root`, `DB_PASSWORD=c2006_20`.

### PowerShell Script Execution Policy
If PowerShell blocks running local npm scripts, run:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
