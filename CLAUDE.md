# School Management System (SMS) — Project Context

## What We Are Building
A web-based School Management System for Highfield Primary School, Kampala Uganda.
Covers Kindergarten (Baby, Day Care, Middle, Top) and Primary (P.1–P.7).
Replaces an unreliable third-party system. Fully owned and operated by the school.

## Tech Stack
- Backend: Node.js v20 + Express.js + Prisma ORM + PostgreSQL 15
- Frontend: React.js 18 + Tailwind CSS + React Query + Zustand
- Auth: JWT (access token 15min, refresh token 7 days, HTTP-only cookie)
- SMS: EgoSMS by Pahappa (comms-sdk npm) — NOT Africa's Talking
- PDF generation: Puppeteer (Handlebars templates)
- Payments: SchoolPay integration (polling, not webhook)
- Photos: Multer + Sharp (resize to 300x400px for pupil photos)

## Project Structure
sms-backend/    → Node.js REST API
sms-frontend/   → React SPA
docs/           → Project documentation
scripts/        → Data migration scripts
storage/        → Generated files (photos, PDFs) — gitignored

---

## Terminology — CRITICAL
- Learners are PUPILS (never "students")
- 3 terms per academic year
- Module is called "Academics" (not "Academic Performance")
- Day pupils = Non-Residents. Boarding pupils = Residents.

---

## User Roles (6 total)
1. system_admin — full access, system settings, user management
2. head_teacher — view all reports, add HT remarks on report cards
3. dos — Director of Studies: manages academics, generates report cards, edits scores after lock
4. bursar — manages all fees, billing, invoices, parent communication
5. class_teacher — enters scores only. Cannot edit after lock. Cannot generate report cards.
6. parent — read-only portal (future release, Low priority)

---

## Class Hierarchy (THREE LEVELS — all configurable in settings)
Class Group → Sub Group → Class
Kindergarten → PrePrimary → Baby, Day Care, Middle, Top
Primary → LowerPrimary → P.1, P.2, P.3, P.4
Primary → UpperPrimary → P.5, P.6, P.7
DB tables: class_groups → class_sub_groups → classes
classes.classSubGroupId FK → class_sub_groups.id (ADDED — Sprint 2 migration)
classes.schoolSectionId FK → school_sections.id (KEPT — still needed for grading rules)

## Fee Grouping (for tuition rates)
- Nursery (all PrePrimary classes): one rate group
- P.1-P.6: one rate group
- P.7: its own rate group
- Day and Boarding rates differ for all three groups
- Fee structures are configured PER ACADEMIC YEAR (not per term)
- fee_structures.academic_year_id FK → academic_years.id (NOT term_id)

---

## Parent / Guardian Model (THREE LEVELS — AAN-002 redesign) ✅ COMPLETE
Each pupil has THREE contact records:
1. Mother (optional): full_name, phone, email, address, NIN → pupil_parents (parent_type='mother')
2. Father (optional): full_name, phone, email, address, NIN → pupil_parents (parent_type='father')
3. Contact Person (required): school's communication contact. Can be mother, father, or third party.
   Fields: full_name, relationship, primary_phone, secondary_phone,
   whatsapp_indicator ('primary'|'secondary'|'none'), email, physical_address
   → contact_persons + pupil_contact_persons junction

Family linking: if two pupils share the same contact_person.primary_phone, they link to one record.
whatsapp_indicator = flag on which of the two phones is on WhatsApp. NOT a separate phone field.

---

## Key Business Rules

### Grading (Uganda MoES 9-point scale — admin configurable)
D1:90-100(1pt) D2:80-89(2pt) C3:75-79(3pt) C4:70-74(4pt)
C5:60-69(5pt) C6:50-59(6pt) P7:40-49(7pt) P8:30-39(8pt) F9:0-29(9pt)
Aggregate = sum of grade points for 4 core subjects
Religious Education EXCLUDED from aggregate (all sections)
Reading and Luganda also EXCLUDED (Lower Primary only)
Division I:4-12 | II:13-23 | III:24-29 | IV:30-34 | U:35-36
F9 PENALTY RULE: F9 in English OR Maths → automatic ONE division demotion
NULL score = absent (not zero). Zero = sat and scored zero. THESE ARE DIFFERENT.
Upper Primary (P.4-P.7): ranked by aggregate ASC (lower=better)
Lower Primary (P.1-P.3): ranked by average score DESC (higher=better)

### Auto-Comments (AAN-002)
Grade remarks: admin configures up to 5 remark options per grade band (D1-F9)
  → stored in grade_remarks table (grade_remarks.remark_number: 1-5)
  → remark_number 1 auto-selected on report card per subject
  → DOS can change via dropdown (all 5 options shown)
  → if none configured, teacher types freely

Division comments: admin configures up to 5 Class Teacher + 5 Headteacher options per division
  → stored in division_remarks table (comment_role: 'class_teacher' or 'headteacher')
  → option_number 1 auto-selected; DOS/HT can change via dropdown
  → auto-comment lookup MUST use the FINAL division (after F9 penalty), not raw division

### Fees & Bursary
- Fees configured PER ACADEMIC YEAR (fee_structures.academic_year_id FK)
- Bursary: agreed_net_fees_ugx is the anchor (preserved on structure_update)
- structure_update: recalculate discount to preserve net fees for bursary pupils
- general_increment: affects ALL pupils including bursary (no protection)
- Bulk billing: auto-computes from class + section + bursary data

### Fee Categories (pre-seeded — Sprint 3)
Standard categories to seed at deployment:
  Tuition       (code: TUI,  isTuition: true)
  Transport     (code: TRP,  isTuition: false)
  UNEB Reg.     (code: UNEB, isTuition: false)
  Admission     (code: ADM,  isTuition: false)
  Books         (code: BKS,  isTuition: false)
  Uniform       (code: UNI,  isTuition: false)
  Art Materials (code: ART,  isTuition: false)

### Fees Invoices (AAN-002)
Invoice workflow: Bill → Generate invoice → Export/Print
Generation modes: Pupil Wise, Class Wise, Family Wise
Invoice format: A5 size. 2 per A4 page. One copy per pupil.
Invoice contains: school header, pupil info (ID, name, class, section),
fee lines table, bursary discount line, previous term arrears, total due,
SchoolPay code box (prominent), Mobile Money number for additional fees,
fine after due date (if configured).
NO bank details. NO multiple copies.

### Communication
- SMS via EgoSMS (comms-sdk npm)
- Use contact_person.primary_phone for SMS and calls by default
- whatsapp_indicator determines which phone for WhatsApp (future)
- WhatsApp deferred to future release
- EgoSMS delivery status: poll every 5 min during school hours (node-cron)
- SchoolPay payments: poll every 30 min Mon–Fri 7am–6pm (node-cron: "*/30 7-18 * * 1-5")
- Phone numbers: normalise to +256XXXXXXXXX before every EgoSMS call

### Report Cards
- DOS and system_admin only can generate and print
- Class teachers: enter scores only
- Format: BOT/MOT/EOT columns, teacher initials per subject, grade guide at bottom
- Grade remarks: auto-selected from grade_remarks, changeable via dropdown or manual fill
- Head teacher and Class teacher comments: auto-selected from division_remarks, changeable via dropdown
- Pupil photo top-right, SchoolPay code on card
- School requirements section per term per class (configurable in report settings)

### Houses (AAN-002) ✅ COMPLETE
- Configurable in system settings → houses table
- NOT hardcoded
- Dropdown on pupil registration form (populated from GET /api/v1/admin/houses/active)
- pupils.houseId FK → houses.id (nullable)
- Default houses seeded (animal names with corresponding colours):
  Lion     → Yellow  #F59E0B
  Leopard  → Red     #EF4444
  Cheetah  → Blue    #3B82F6
  Tiger    → Green   #10B981

### Institution Profile (AAN-002) ✅ COMPLETE
Configured in system settings → school_settings table
Fields: schoolName, schoolMotto, addressLine1, addressLine2, phonePrimary, phoneSecondary,
email, website, logoPath, mobileMoneyMtn, mobileMoneyAirtel, mobileMoneyAccountName,
invoiceFineAfterDueDate, stampNotice, reportFooterMotto, gradeGuideText
API: GET/PUT /api/v1/admin/settings/profile (multipart/form-data for logo upload)
Logo served as static file: GET /storage/logos/:filename

---

## Academics Module — 8-Step Guided Workflow (AAN-002)
Visual stepper at top of Academics module. Tracks per-term in term_workflow_steps table.
Step 1: Setup Subjects
Step 2: Register Pupils for Subjects
Step 3: Assessable Subjects
Step 4: Assign Teachers
Step 5: Grades and Comments (grading scale + auto-comments config)
Step 6: Evaluate Sets (assessment types + score-entry windows)
Step 7: Process Reports (grading engine + report card generation, DOS/Admin only)
Step 8: Promote (end-of-year class promotion)
Stepper states: done=teal tick circle | active=blue filled circle | pending=grey outline circle

---

## Database Key Rules
- All PKs: UUID (@default(uuid()))
- Soft delete: deletedAt on pupils, contact_persons, users
- All money: Int (Uganda Shillings, no decimals)
- pupil_scores.score: Int? (nullable — NULL=absent, 0=sat+scored zero)
- All grading rules: DATA in DB tables — nothing hardcoded in code
- fee_structures: academic_year_id FK (NOT term_id)
- grade_remarks: grading_scale_entry_id FK
- division_remarks: division_boundary_id FK

---

## EgoSMS Integration
Package: comms-sdk (npm)
Auth: CommsSDK.authenticate(EGOSMS_USERNAME, EGOSMS_PASSWORD)
.env: EGOSMS_USERNAME, EGOSMS_PASSWORD, EGOSMS_SENDER_ID
DB column: egoSmsMessageId (not atMessageId)
Delivery: poll every 5 min during school hours
Phone format: +256XXXXXXXXX always

---

## UI Design Direction (AAN-002)
MVP prototype (March 2026) = visual benchmark. Match it.
Keep: ribbon-style tabs per module, dense data grids, context action bars, modals, navy sidebar
Improve: flat design, visual hierarchy, colour-as-meaning, responsive, 12px min table font

Colour semantics (apply consistently everywhere):
- Teal #148F77 = paid / success / complete / done
- Amber #F39C12 = partial / pending / in progress
- Red #C0392B = overdue / error / failed
- Blue #2471A3 = primary actions / info
- Navy #1A3C5E = sidebar / headers

Components:
- Sidebar: 200px, navy, section labels, active = left border accent in blue
- Data grids: alternating rows #F8FAFF, sticky headers, 8px/12px padding
- Academics stepper: numbered circles, done=teal, active=blue, pending=grey
- Badges: semantic colour with matching light background

---

## Working Rules

### 0. Reference Documents — MANDATORY before every sprint task
ALWAYS read the relevant reference documents in the `/docs/` folder before planning or
implementing any feature. These documents are the authoritative source of truth for
requirements, business rules, database design, and UI/UX specifications. The summary in
this CLAUDE.md is a convenience — the full detail is in the docs. Do not rely solely on
CLAUDE.md for field-level specs, workflow details, or PDF/screen layouts.

Documents to reference:
- `/docs/SMS_Requirements_Analysis_v1.2.md` — full functional requirements per module
- `/docs/SMS_System_Architecture_v1.1.md` — service layer design, adapter specs, RBAC matrix
- `/docs/SMS_Database_Design.md` — authoritative table/column/constraint definitions
- `/docs/SMS_Database_Design_Amendment_v1.2.md` — schema additions (grade_remarks, division_remarks, term_workflow_steps, fee_invoices)
- `/docs/SMS_Architecture_Amendment_AAN001.md` — EgoSMS adapter spec, delivery polling
- `/docs/SMS_Architecture_Amendment_AAN002.md` — AAN-002 full change register (parent model, class hierarchy, auto-comments, invoice format, workflow stepper, UI direction)
- `/docs/SMS_UIUX_Design.md` — screen wireframes, component patterns, typography
- `/docs/SMS_UIUX_Design_v1.1_Update.md` — updated wireframes (pupil detail, billing, report card workflow)
- `/docs/Sample report card.pdf` — actual report card physical format (read before Sprint 4)

This rule overrides any instruction to "just get started". Read first, then build.

### 1. Testing — MANDATORY after every service
After building ANY service file, ALWAYS write a Jest unit test immediately.
Location: sms-backend/src/__tests__/services/[ServiceName].test.js
Mock all Prisma calls. Mock all external adapters.
Cover: (a) happy path (b) validation errors (c) edge cases (d) error handling
Run: npx jest src/__tests__/services/[ServiceName].test.js — ALL must pass before moving on.

### 2. Testing — After every API controller
Integration test: sms-backend/src/__tests__/controllers/[ResourceName].test.js
Use supertest. Test: 200/201, 400, 401, 403, 404, 422.

### 3. Code quality
async/await only. try/catch on all async. next(err) for errors.
Error format: { error: { message, code } } — no stack traces in responses.
JSDoc on every service method. Meaningful variable names.

### 4. Git
git add . && git commit -m "feat: [description]"
Prefixes: feat: fix: chore: test: refactor:

### 5. Prisma
Use shared client from src/lib/prisma.js always. (NOT src/utils/prisma.js)
Multi-step operations: prisma.$transaction([...])
No raw SQL. After schema change: npx prisma migrate dev && npx prisma generate

### 6. Security
JWT: access token in response body only. Refresh token in HTTP-only cookie only.
Validate all inputs with express-validator before service layer.
Multer: validate MIME type and size before processing.
Never log passwords, secrets, or API keys.

### 7. One thing at a time
Complete one task fully (code + tests + commit) before starting the next.

### 8. Sprint Prompt Response Structure — MANDATORY
For every sprint prompt, structure the response in three parts:

PART 1 — TODO LIST (at the start, before any code is written)
Read the prompt, then create your own checkbox todo list of every task you
plan to complete. This is your execution plan — derive it from the prompt,
do not wait to be given the list. Example:
  Update Todos
  * Create HouseService.js + HouseController.js + houseRoutes.js
  * Register house routes in app.js
  * Write HouseService unit tests
  * Add HousesTab to AdminPage.jsx

PART 2 — PROGRESSIVE STRIKE-THROUGH (during execution)
As each task is completed, strike it through in the todo list. Example:
  * ~~Create HouseService.js + HouseController.js + houseRoutes.js~~
  * ~~Register house routes in app.js~~
  * Write HouseService unit tests
  * Add HousesTab to AdminPage.jsx

PART 3 — SUMMARY (at the end, after all tasks are complete)
Provide a structured summary with these sections:
  - Backend: bullet list of every backend file created/changed + what it does
  - Frontend: bullet list of every frontend file created/changed + what it does
  - Database: migrations run, schema changes made
  - Tests: number of tests written, confirmation all pass
  - Any important notes (e.g. business rules applied, decisions made, watch-outs)

Never skip the summary. Never skip the todo list. This structure is required
for every prompt regardless of how small the task is.

---

## File Naming
Services: PascalCase — PupilService.js
Controllers: PascalCase — PupilController.js
Routes: camelCase — pupilRoutes.js
Tests: match source file name — PupilService.test.js, PupilController.test.js
Adapters: PascalCase — EgoSMSAdapter.js

## Test Template (ESM — project uses ES modules)
```js
import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// Mock registrations MUST come before all imports
jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    modelName: {
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      findMany:   jest.fn(),
      create:     jest.fn(),
      update:     jest.fn(),
      delete:     jest.fn(),
    },
  },
}));

let ServiceUnderTest;
let prismaModule;

beforeAll(async () => {
  prismaModule      = await import('../../lib/prisma.js');
  ServiceUnderTest  = await import('../../services/ServiceUnderTest.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ServiceUnderTest', () => {
  describe('methodName', () => {
    test('should [behaviour] when [condition]', async () => {
      // Arrange
      prismaModule.prisma.modelName.findUnique.mockResolvedValue({ id: 'uuid', ... });
      // Act
      const result = await ServiceUnderTest.methodName(args);
      // Assert
      expect(result).toEqual(expect.objectContaining({ ... }));
    });
  });
});
```

---

## Sprint Plan
Sprint 0 (Weeks 1-2):  Environment setup, schema, seed ✅ COMPLETE
Sprint 1 (Weeks 3-4):  Auth + Pupil management ✅ COMPLETE
Sprint 1 back-fill:    Guardian model (3-level) ✅ COMPLETE
Sprint 2 (Weeks 5-6):  School configuration 🔄 IN PROGRESS
  ✅ Done: Houses API + frontend, Institution Profile API + frontend
  ⏳ Remaining: Class hierarchy (3-level), Academic calendar write endpoints,
                User management, Subjects, Grading scale, Assessment types,
                Report card settings, All remaining frontend settings screens
Sprint 3 (Weeks 7-8):  Fees module (fee structure per year, A5 invoices, SchoolPay)
Sprint 4 (Weeks 9-10): Academics (8-step workflow, scores, grading engine, auto-comments, report cards)
Sprint 5 (Weeks 11-12): Communication (EgoSMS, follow-up queue)
Sprint 6 (Weeks 13-14): Data migration + testing + hardening
Sprint 7 (Weeks 15-16): Go-live + parallel running
Future: WhatsApp (adapter only — no schema/UI changes needed)

## Reference Documents
/docs/SMS_Requirements_Analysis_v1.2.md
/docs/SMS_System_Architecture_v1.1.md
/docs/SMS_Database_Design.md
/docs/SMS_Database_Design_Amendment_v1.2.md
/docs/SMS_Architecture_Amendment_AAN001.md
/docs/SMS_Architecture_Amendment_AAN002.md

## When to Read the Reference Documents
Claude Code must read the relevant document(s) BEFORE starting work on any
prompt that involves the areas listed below. Do not rely on CLAUDE.md summaries
alone for these — open and read the actual file first.

| If the prompt involves...              | Read this document first                        |
|----------------------------------------|-------------------------------------------------|
| Schema changes or new DB tables        | /docs/SMS_Database_Design.md                    |
|                                        | /docs/SMS_Database_Design_Amendment_v1.2.md     |
| Grading engine, scores, report cards   | /docs/SMS_Database_Design.md (Section 7)        |
|                                        | /docs/SMS_Requirements_Analysis_v1.2.md (S3.4) |
| Fees, bursary, billing, invoices       | /docs/SMS_Database_Design.md (Group E)          |
|                                        | /docs/SMS_Database_Design_Amendment_v1.2.md     |
|                                        | /docs/SMS_Requirements_Analysis_v1.2.md (S3.2) |
| EgoSMS adapter or communication module | /docs/SMS_Architecture_Amendment_AAN001.md      |
| Any AAN-002 feature (houses, hierarchy,|                                                 |
| invoices, auto-comments, stepper)      | /docs/SMS_Architecture_Amendment_AAN002.md      |
| System architecture, service layer,    |                                                 |
| new adapters, RBAC                     | /docs/SMS_System_Architecture_v1.1.md           |
| Any functional requirement unclear     | /docs/SMS_Requirements_Analysis_v1.2.md         |

When in doubt, read the relevant document. CLAUDE.md is a quick reference —
the /docs files are the full specification and take precedence.

## Current Sprint
Sprint 2 — School Configuration (remaining work: see Sprint Plan above)