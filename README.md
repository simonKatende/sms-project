# School Management System (SMS)

A web-based school management system built for a Ugandan primary school (Nursery – P.7).
Replaces an unreliable third-party system with a fully in-house, school-owned solution.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js 20 + Express 5 + Prisma 7 ORM |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Vite + Tailwind CSS + React Query + Zustand |
| Auth | JWT (access 15 min / refresh 7 days, HTTP-only cookie) |
| SMS | EgoSMS via `comms-sdk` (Pahappa) |
| PDF generation | Puppeteer (headless Chrome) |
| Payments | SchoolPay (polling, no webhook) |
| Photo uploads | Multer + Sharp (resized to 300×400 px) |

## Project Structure

```
sms-project/
├── sms-backend/        # Node.js REST API
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── integrations/
│   │   ├── scheduler/
│   │   ├── templates/
│   │   ├── utils/
│   │   ├── lib/
│   │   │   └── prisma.js       # Prisma client singleton
│   │   ├── app.js              # Express app (middleware + routes)
│   │   └── server.js           # Entry point (boot + DB connect)
│   ├── prisma/
│   │   ├── schema.prisma       # 44-table DB schema (Groups A–H)
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── generated/prisma/       # Prisma v7 generated TS client
│   ├── storage/
│   │   ├── photos/             # Pupil passport photos
│   │   └── pdfs/               # Generated report cards & statements
│   ├── prisma.config.ts
│   ├── .env                    # Local env vars (not committed)
│   └── .env.example            # Template — copy to .env
├── sms-frontend/       # React SPA
│   └── src/
│       ├── pages/
│       ├── features/
│       │   ├── auth/
│       │   ├── pupils/
│       │   ├── fees/
│       │   ├── academics/
│       │   ├── communication/
│       │   └── admin/
│       ├── components/
│       ├── api/
│       ├── store/
│       ├── router/
│       └── utils/
└── docs/               # Architecture, DB design, requirements
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15
- npm 10+

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd sms-project

# Backend
cd sms-backend && npm install

# Frontend
cd ../sms-frontend && npm install
```

### 2. Configure environment variables

```bash
cd sms-backend
cp .env.example .env
```

Edit `.env` and fill in your values — at minimum:

```env
DATABASE_URL=postgresql://sms_user:yourpassword@localhost:5432/sms_db
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<64-char random string>
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Set up the database

Create the database in PostgreSQL, then run migrations and seed:

```bash
cd sms-backend

npx prisma migrate dev --name init   # creates all 44 tables
npm run db:seed                      # seeds roles, grading scale, admin user
```

Default admin credentials (change on first login):
- **Username:** `admin`
- **Password:** `Admin@1234`

### 4. Start the servers

```bash
# Backend (from sms-backend/)
npm run dev          # nodemon watch mode
# or
npm start            # production

# Frontend (from sms-frontend/)
npm run dev
```

| Service | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Health check | http://localhost:3000/health |
| Prisma Studio | `npm run db:studio` (from sms-backend/) |
| Frontend | http://localhost:5173 |

> **Important:** Always run backend commands (`npm run dev`, `npx prisma ...`) from inside `sms-backend/`, not from the repo root.

## User Roles

| Role | Access |
|---|---|
| `system_admin` | Full access — all modules and settings |
| `head_teacher` | View reports, add HT remarks on report cards |
| `dos` | Manages academics, generates report cards, edits scores |
| `bursar` | Manages all fees, billing, parent communication |
| `class_teacher` | Enters scores only (cannot edit after lock) |
| `parent` | Read-only portal (future release) |

## Key Business Rules

- **Grading:** Uganda MoES 9-point scale (D1–F9), configurable by admin
- **Aggregate:** Sum of grade points across 4 core subjects (English, Maths, Science, Social Studies)
- **Divisions:** I (4–12 pts) → IV (30–34 pts) → U (35–36 pts)
- **F9 penalty:** F9 in English **or** Maths → automatic demotion by one division
- **Absent vs zero:** `NULL` score = absent; `0` = sat and scored zero — treated differently throughout
- **Ranking:** Upper Primary (P.4–P.7) by aggregate · Lower Primary (P.1–P.3) by average
- **Bursary:** `agreed_net_fees_ugx` is the anchor — preserved when fee structures change; only `discount_ugx` is recalculated
- **Fees:** All amounts stored as `INT` (Uganda Shillings, no decimals)

## Database Schema

44 tables across 8 groups:

| Group | Tables |
|---|---|
| A — Users & Access | `roles`, `users`, `user_roles`, `sessions`, `audit_logs` |
| B — School Config | `school_settings`, `academic_years`, `terms`, `school_sections`, `classes`, `streams` |
| C — Subjects & Grading | `subjects`, `class_subject_assignments`, `subject_section_rules`, `grading_scales`, `grading_scale_entries`, `division_boundaries`, `assessment_type_configs` |
| D — Pupils & Families | `pupils`, `guardians`, `pupil_guardians`, `pupil_photos` |
| E — Fees | `fee_categories`, `fee_structures`, `bursary_schemes`, `pupil_bursaries`, `pupil_bills`, `bill_line_items`, `payments`, `payment_plans`, `payment_plan_instalments`, `fee_statements`, `fee_structure_adjustments` |
| F — Academic | `assessment_periods`, `pupil_scores`, `pupil_term_results`, `report_card_settings`, `report_cards`, `term_requirements` |
| G — Communication | `communication_logs`, `message_templates`, `demand_notes` |
| H — System | `system_settings`, `scheduled_job_logs` |

## Useful Commands

```bash
# From sms-backend/

npm run dev              # start with nodemon
npm start                # start without nodemon
npm test                 # run Jest tests
npm run db:migrate       # run pending migrations (dev)
npm run db:migrate:deploy # run migrations (production)
npm run db:generate      # regenerate Prisma client
npm run db:seed          # seed reference data
npm run db:studio        # open Prisma Studio
npm run db:reset         # reset DB and re-run migrations (dev only)
```

## Sprint Plan

| Sprint | Weeks | Scope |
|---|---|---|
| 0 | 1–2 | Environment setup, Prisma schema, seed data ✅ |
| 1 | 3–4 | Auth + Pupil management |
| 2 | 5–6 | School configuration + Academic setup |
| 3 | 7–8 | Fees module |
| 4 | 9–10 | Academic results + Grading engine + Report cards |
| 5 | 11–12 | Communication + EgoSMS |
| 6 | 13–14 | Data migration + Testing + Hardening |
| 7 | 15–16 | Go-live + Parallel running |

## Documentation

Full design documents are in [`docs/`](docs/):

- `SMS_Requirements_Analysis_v1.2.md` — functional requirements
- `SMS_System_Architecture_v1.1.md` — system architecture
- `SMS_Database_Design.md` — full DB schema (v1.0)
- `SMS_Database_Design_v1.1_Update.md` — bursary schema update
- `SMS_Architecture_Amendment_AAN001.md` — EgoSMS amendment
- `SMS_UIUX_Design.md` — UI/UX wireframes and flows
