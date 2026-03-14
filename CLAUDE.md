# School Management System (SMS) — Project Context

## What We Are Building
A web-based School Management System for a Ugandan primary school (P.1–P.7 and Nursery).
Replaces an unreliable third-party system. In-house, fully owned by the school.

## Tech Stack
- Backend: Node.js v20 + Express.js + Prisma ORM + PostgreSQL 15
- Frontend: React.js 18 + Tailwind CSS + React Query + Zustand
- Auth: JWT (access token 15min, refresh token 7 days, HTTP-only cookie)
- SMS: EgoSMS by Pahappa (comms-sdk npm) — NOT Africa's Talking
- PDF: Puppeteer (headless Chrome)
- Payments: SchoolPay integration (polling, not webhook)
- Photos: Multer + Sharp (resize to 300x400px)

## Project Structure
sms-backend/   → Node.js REST API
sms-frontend/  → React SPA
docs/          → Project documentation
scripts/       → Migration scripts
storage/       → Generated files (photos, PDFs) — gitignored

## Terminology
- Learners are called PUPILS (never "students" — Ugandan primary school standard)
- 3 terms per academic year (Uganda standard calendar)

## User Roles (6 total)
1. system_admin — full access
2. head_teacher — view reports, add HT remarks on report cards
3. dos (Director of Studies) — manages academics, generates report cards, edits scores
4. bursar — manages all fees, billing, parent communication
5. class_teacher — enters scores only (cannot edit after lock, cannot generate report cards)
6. parent — read-only portal (future release, Low priority)

## Key Business Rules
### Grading (Uganda MoES 9-point scale — CONFIGURABLE by admin)
- D1: 90-100 (1pt) | D2: 80-89 (2pt) | C3: 75-79 (3pt) | C4: 70-74 (4pt)
- C5: 60-69 (5pt) | C6: 50-59 (6pt) | P7: 40-49 (7pt) | P8: 30-39 (8pt) | F9: 0-29 (9pt)
- Aggregate = sum of grade points for 4 core subjects (English, Maths, Science, Social Studies)
- Division I: 4-12 | Division II: 13-23 | Division III: 24-29 | Division IV: 30-34 | U: 35-36
- F9 PENALTY RULE: F9 in English OR Maths → automatic demotion by one division
- NULL score = absent (not zero). Zero = sat and scored zero. These are DIFFERENT.
- Two sections: Upper Primary (P.4-P.7) ranked by aggregate | Lower Primary (P.1-P.3) ranked by average

### Fees & Bursary
- Fees differ by class AND section (Day vs Boarding)
- Bursary stores agreed_net_fees_ugx (fixed UGX amount pupil pays per term)
- When fee structure changes (structure_update): recalculate discount to preserve agreed net fees
- When fee structure changes (general_increment): affect ALL pupils including bursary — no recalculation
- Bulk billing per class: system auto-generates bills using class + section + bursary data

### Communication
- SMS via EgoSMS (comms-sdk npm package)
- Guardian has TWO phone fields: phone_call and phone_whatsapp (separate — can differ)
- WhatsApp integration deferred to future release
- Delivery status via polling (not webhook)

### Report Cards
- Only DOS and system_admin can generate and print report cards
- Class teachers can only enter scores
- Report card matches school sample format: BOT/MOT/EOT columns, teacher initials per subject,
  grade guide at bottom, school requirements, next term dates (Day and Boarding separate)
- Pupil photo top-right, SchoolPay code shown on card

## Database Key Rules
- All PKs are UUID
- Soft delete via deletedAt (NULL = active)
- All money stored as INT (Uganda Shillings, no decimals)
- pupil_scores.score is Int? (nullable — NULL means absent, 0 means scored zero)
- All grading rules are DATA (stored in DB tables) — nothing hardcoded

## EgoSMS Integration
- Package: comms-sdk (npm)
- Auth: CommsSDK.authenticate(username, password)
- .env vars: EGOSMS_USERNAME, EGOSMS_PASSWORD, EGOSMS_SENDER_ID
- Delivery status: poll every 5 min (node-cron) — no webhook
- DB column: egoSmsMessageId (not atMessageId)
- Phone numbers must be normalised to +256XXXXXXXXX before sending

---

## Working Rules — Follow These on Every Task

### 1. Testing — MANDATORY after every service
After building ANY service file (e.g. PupilService.js, GradingEngineService.js, FeesService.js):
- ALWAYS write a Jest unit test file immediately after, without being asked
- Test file location: sms-backend/tests/unit/[ServiceName].test.js
- Mock all Prisma database calls using jest.mock()
- Mock all external adapters (EgoSMSAdapter, SchoolPayAdapter, PuppeteerPDFAdapter)
- Every test file MUST cover:
  a. Happy path (normal successful operation)
  b. Validation errors (invalid inputs)
  c. Edge cases specific to that service (e.g. F9 penalty, bursary recalculation, null scores)
  d. Error handling (what happens when DB or external service fails)
- After writing the test file, run it: npx jest tests/unit/[ServiceName].test.js
- All tests must pass before moving on. Fix failures before proceeding.

### 2. Testing — After every API controller
After building ANY controller + route:
- Write an integration test: sms-backend/tests/integration/[resource].test.js
- Use supertest to make HTTP requests against the Express app
- Test: 200/201 success, 400 validation error, 401 unauthenticated, 403 wrong role, 404 not found
- Run: npx jest tests/integration/[resource].test.js

### 3. Code quality — apply to every file
- Use async/await throughout — no .then() chains
- Always wrap async operations in try/catch and pass errors to next(err)
- Never expose stack traces in error responses — use { error: { message, code } } format
- Add JSDoc comments to every service method explaining what it does, params, and return value
- Use meaningful variable names — no single letters except loop counters

---

## File Naming Conventions
- Services: PascalCase — e.g. PupilService.js, GradingEngineService.js
- Controllers: PascalCase — e.g. PupilController.js
- Routes: camelCase — e.g. pupilRoutes.js
- Tests: match the file they test — e.g. PupilService.test.js
- Integrations/Adapters: PascalCase — e.g. EgoSMSAdapter.js

## Test File Structure Template
Every unit test file must follow this structure:

```javascript
// tests/unit/ExampleService.test.js
const ExampleService = require('../../src/services/ExampleService');

// Mock Prisma
jest.mock('../../src/utils/prisma', () => ({
  modelName: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
}));

describe('ExampleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should [expected behaviour] when [condition]', async () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

---

## Sprint Plan (16 weeks total)
- Sprint 0 (Weeks 1-2): Environment setup, Prisma schema, seed data
- Sprint 1 (Weeks 3-4): Auth + Pupil management
- Sprint 2 (Weeks 5-6): School configuration + Academic setup
- Sprint 3 (Weeks 7-8): Fees module
- Sprint 4 (Weeks 9-10): Academic results + Grading engine + Report cards
- Sprint 5 (Weeks 11-12): Communication + EgoSMS
- Sprint 6 (Weeks 13-14): Data migration + Testing + Hardening
- Sprint 7 (Weeks 15-16): Go-live + Parallel running
- Future: WhatsApp integration (no schema/UI changes needed — adapter only)

## Reference Documents (read when needed for detailed context)
- /docs/SMS_Requirements_Analysis_v1.2.md
- /docs/SMS_System_Architecture_v1.1.md
- /docs/SMS_Database_Design.md
- /docs/SMS_Architecture_Amendment_AAN001.md

## Current Sprint
Sprint 1 — Authentication & Pupil Management