/**
 * PupilController integration tests (supertest)
 *
 * Tests the full HTTP layer:
 *   - Authentication enforcement (JWT)
 *   - Role-based access control
 *   - Request body validation (express-validator)
 *   - Response shape
 *   - Error propagation from the service layer
 *
 * PupilService is mocked — no DB or filesystem access in these tests.
 *
 * ESM note: In ESM mode (--experimental-vm-modules) Jest does not inject the
 * `jest` object as a global — it must be imported from @jest/globals.
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Environment setup (before any module is imported) ────────

process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-long-enough-for-hs256-at-least-32-bytes';
process.env.NODE_ENV          = 'test';

// ── Mock registrations ────────────────────────────────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    userRole:  { findFirst: jest.fn() },
    auditLog:  { create:    jest.fn() },
    session:   { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    user:      { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.unstable_mockModule('../../services/PupilService.js', () => ({
  registerPupil: jest.fn(),
}));

// ── Module variables ──────────────────────────────────────────

let request;
let app;
let PupilService;
let jwt;

// ── Shared fixtures ───────────────────────────────────────────

/** Minimal valid request body — all required fields present */
const validBody = {
  firstName:   'Jane',
  lastName:    'Nakato',
  dateOfBirth: '2018-03-10',
  gender:      'Female',
  section:     'Day',
  contactPerson: {
    fullName:     'Sarah Nakato',
    relationship: 'Mother',
    primaryPhone: '+256772123456',
  },
};

/** Mock pupil returned by the mocked service */
const mockPupil = {
  id:          'pupil-uuid-abc123',
  pupilIdCode: 'HPS-2026-0001',
  firstName:   'Jane',
  lastName:    'Nakato',
  gender:      'Female',
  section:     'Day',
  stream:      null,
  pupilParents:        [],
  pupilContactPersons: [{
    id:              'junc-uuid',
    isPrimary:       true,
    contactPerson: { id: 'cp-uuid', fullName: 'Sarah Nakato', primaryPhone: '+256772123456' },
  }],
  pupilBursaries: [],
  pupilPhoto:     null,
};

// ── Setup ─────────────────────────────────────────────────────

beforeAll(async () => {
  const supertest  = await import('supertest');
  request          = supertest.default;

  ({ default: app }      = await import('../../app.js'));
  PupilService           = await import('../../services/PupilService.js');
  jwt                    = await import('jsonwebtoken');
});

beforeEach(() => {
  jest.clearAllMocks();
  PupilService.registerPupil.mockResolvedValue(mockPupil);
});

// ── Token helpers ─────────────────────────────────────────────

function makeToken(roleName) {
  return jwt.default.sign(
    { sub: `${roleName}-uuid`, roleId: `${roleName}-role-uuid`, roleName },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' },
  );
}

// ── Tests ─────────────────────────────────────────────────────

describe('POST /api/v1/pupils', () => {

  // ── Authentication ───────────────────────────────────────

  describe('authentication', () => {
    test('returns 401 when Authorization header is absent', async () => {
      const res = await request(app).post('/api/v1/pupils').send(validBody);
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    test('returns 401 when token is malformed', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .send(validBody);
      expect(res.status).toBe(401);
    });

    test('returns 401 when token is signed with wrong secret', async () => {
      const badToken = jwt.default.sign(
        { sub: 'x', roleId: 'y', roleName: 'system_admin' },
        'wrong-secret',
        { expiresIn: '1h' },
      );
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${badToken}`)
        .send(validBody);
      expect(res.status).toBe(401);
    });
  });

  // ── Role-based access control ────────────────────────────

  describe('role access control', () => {
    test('returns 403 when role is class_teacher', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${makeToken('class_teacher')}`)
        .send(validBody);
      expect(res.status).toBe(403);
    });

    test('returns 403 when role is head_teacher', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${makeToken('head_teacher')}`)
        .send(validBody);
      expect(res.status).toBe(403);
    });

    test('returns 403 when role is dos', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${makeToken('dos')}`)
        .send(validBody);
      expect(res.status).toBe(403);
    });

    test('accepts system_admin role', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${makeToken('system_admin')}`)
        .send(validBody);
      expect(res.status).toBe(201);
    });

    test('accepts bursar role', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${makeToken('bursar')}`)
        .send(validBody);
      expect(res.status).toBe(201);
    });
  });

  // ── Successful registration ──────────────────────────────

  describe('successful registration', () => {
    const adminToken = () => makeToken('system_admin');

    test('returns 201 with { data: pupil } on success', async () => {
      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe('pupil-uuid-abc123');
      expect(res.body.data.pupilIdCode).toBe('HPS-2026-0001');
    });

    test('passes correct pupil fields to PupilService', async () => {
      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ ...validBody, religion: 'Catholic', house: 'Blue' });

      const { pupilFields } = PupilService.registerPupil.mock.calls[0][0];
      expect(pupilFields.firstName).toBe('Jane');
      expect(pupilFields.lastName).toBe('Nakato');
      expect(pupilFields.gender).toBe('Female');
      expect(pupilFields.section).toBe('Day');
      expect(pupilFields.religion).toBe('Catholic');
      expect(pupilFields.house).toBe('Blue');
    });

    test('passes contactPerson fields from body.contactPerson', async () => {
      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validBody);

      const { contactPerson } = PupilService.registerPupil.mock.calls[0][0];
      expect(contactPerson.fullName).toBe('Sarah Nakato');
      expect(contactPerson.relationship).toBe('Mother');
      expect(contactPerson.primaryPhone).toBe('+256772123456');
    });

    test('passes mother fields when provided', async () => {
      const body = {
        ...validBody,
        mother: { fullName: 'Mary Nakato', phone: '+256701000001' },
      };
      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(body);

      const { mother } = PupilService.registerPupil.mock.calls[0][0];
      expect(mother).not.toBeNull();
      expect(mother.fullName).toBe('Mary Nakato');
    });

    test('passes null mother when not provided', async () => {
      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validBody);

      const { mother } = PupilService.registerPupil.mock.calls[0][0];
      expect(mother).toBeNull();
    });

    test('passes authenticated user ID as createdById', async () => {
      const token = jwt.default.sign(
        { sub: 'specific-admin-uuid', roleId: 'r', roleName: 'system_admin' },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: '1h' },
      );

      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${token}`)
        .send(validBody);

      const { createdById } = PupilService.registerPupil.mock.calls[0][0];
      expect(createdById).toBe('specific-admin-uuid');
    });

    test('sets bursaryFields to null when isBursary is absent', async () => {
      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validBody);

      const { bursaryFields } = PupilService.registerPupil.mock.calls[0][0];
      expect(bursaryFields).toBeNull();
    });

    test('parses isBursary=true (boolean) and passes bursaryFields', async () => {
      const body = {
        ...validBody,
        isBursary: true,
        bursary: { schemeName: 'Gov Bursary', standardFeesAtAward: 600000, discountUgx: 200000 },
      };

      await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(body);

      const { bursaryFields } = PupilService.registerPupil.mock.calls[0][0];
      expect(bursaryFields).not.toBeNull();
      expect(bursaryFields.bursarySchemeName).toBe('Gov Bursary');
      expect(bursaryFields.standardFeesAtAward).toBe(600000);
      expect(bursaryFields.discountUgx).toBe(200000);
    });
  });

  // ── Input validation ─────────────────────────────────────

  describe('input validation', () => {
    const adminToken = () => makeToken('system_admin');

    function postWith(body) {
      return request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(body);
    }

    function without(field) {
      const body = JSON.parse(JSON.stringify(validBody));
      const parts = field.split('.');
      if (parts.length === 2) {
        delete body[parts[0]][parts[1]];
      } else {
        delete body[field];
      }
      return body;
    }

    // Required pupil fields
    test('returns 422 when firstName is missing', async () => {
      const res = await postWith(without('firstName'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'firstName')).toBe(true);
    });

    test('returns 422 when lastName is missing', async () => {
      const res = await postWith(without('lastName'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'lastName')).toBe(true);
    });

    test('returns 422 when dateOfBirth is missing', async () => {
      const res = await postWith(without('dateOfBirth'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'dateOfBirth')).toBe(true);
    });

    test('returns 422 when dateOfBirth is in the future', async () => {
      const res = await postWith({ ...validBody, dateOfBirth: '2099-01-01' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'dateOfBirth')).toBe(true);
    });

    test('returns 422 when dateOfBirth is not a valid date', async () => {
      const res = await postWith({ ...validBody, dateOfBirth: 'not-a-date' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'dateOfBirth')).toBe(true);
    });

    test('returns 422 when gender is missing', async () => {
      const res = await postWith(without('gender'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'gender')).toBe(true);
    });

    test('returns 422 when gender is not Male or Female', async () => {
      const res = await postWith({ ...validBody, gender: 'Other' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'gender')).toBe(true);
    });

    test('returns 422 when section is missing', async () => {
      const res = await postWith(without('section'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'section')).toBe(true);
    });

    test('returns 422 when section is not Day or Boarding', async () => {
      const res = await postWith({ ...validBody, section: 'Weekly' });
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'section')).toBe(true);
    });

    // Contact person fields
    test('returns 422 when contactPerson.fullName is missing', async () => {
      const res = await postWith(without('contactPerson.fullName'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'contactPerson.fullName')).toBe(true);
    });

    test('returns 422 when contactPerson.relationship is missing', async () => {
      const res = await postWith(without('contactPerson.relationship'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'contactPerson.relationship')).toBe(true);
    });

    test('returns 422 when contactPerson.primaryPhone is missing', async () => {
      const res = await postWith(without('contactPerson.primaryPhone'));
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'contactPerson.primaryPhone')).toBe(true);
    });

    test('returns 422 when contactPerson.primaryPhone is not +256 format', async () => {
      const body = { ...validBody, contactPerson: { ...validBody.contactPerson, primaryPhone: '0772123456' } };
      const res  = await postWith(body);
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'contactPerson.primaryPhone')).toBe(true);
    });

    test('returns 422 when contactPerson.primaryPhone has wrong digit count', async () => {
      const body = { ...validBody, contactPerson: { ...validBody.contactPerson, primaryPhone: '+25677212345' } };
      const res  = await postWith(body);
      expect(res.status).toBe(422);
    });

    test('returns 422 when contactPerson.secondaryPhone is provided but invalid format', async () => {
      const body = { ...validBody, contactPerson: { ...validBody.contactPerson, secondaryPhone: '0701234567' } };
      const res = await postWith(body);
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'contactPerson.secondaryPhone')).toBe(true);
    });

    test('accepts valid contactPerson.secondaryPhone in +256 format', async () => {
      const body = { ...validBody, contactPerson: { ...validBody.contactPerson, secondaryPhone: '+256701234567' } };
      const res = await postWith(body);
      expect(res.status).toBe(201);
    });

    test('returns 422 when mother.phone is provided but invalid format', async () => {
      const body = { ...validBody, mother: { fullName: 'Mary', phone: '0701234567' } };
      const res = await postWith(body);
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'mother.phone')).toBe(true);
    });

    // Bursary conditional validation
    test('returns 422 when isBursary=true and bursary.standardFeesAtAward is missing', async () => {
      const body = { ...validBody, isBursary: true, bursary: { schemeName: 'Gov', discountUgx: 100000 } };
      const res = await postWith(body);
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'bursary.standardFeesAtAward')).toBe(true);
    });

    test('returns 422 when isBursary=true and bursary.discountUgx is not a positive integer', async () => {
      const body = { ...validBody, isBursary: true, bursary: { schemeName: 'Gov', standardFeesAtAward: 600000, discountUgx: 0 } };
      const res = await postWith(body);
      expect(res.status).toBe(422);
      expect(res.body.errors.some(e => e.path === 'bursary.discountUgx')).toBe(true);
    });

    test('does not require bursary fields when isBursary is absent', async () => {
      const res = await postWith(validBody);
      expect(res.status).toBe(201);
    });
  });

  // ── Error propagation ────────────────────────────────────

  describe('error propagation', () => {
    const adminToken = () => makeToken('system_admin');

    test('returns 422 when service throws a 422 error', async () => {
      PupilService.registerPupil.mockRejectedValue(
        Object.assign(new Error('Bursary scheme not found'), { status: 422 }),
      );

      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validBody);

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('Bursary scheme not found');
    });

    test('returns 500 when service throws an unexpected error', async () => {
      PupilService.registerPupil.mockRejectedValue(new Error('Database connection lost'));

      const res = await request(app)
        .post('/api/v1/pupils')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send(validBody);

      expect(res.status).toBe(500);
    });
  });
});
