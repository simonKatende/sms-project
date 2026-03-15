/**
 * PupilService unit tests — 3-level guardian model (AAN-002 redesign)
 *
 * Covers:
 *   - Pupil ID generation
 *   - Contact person family linking
 *   - Mother / father optional parent records
 *   - Contact person required validation
 *   - Bursary validation
 *   - Photo handling
 *   - Audit log
 *
 * ESM note: In ESM mode (--experimental-vm-modules) Jest does not inject the
 * `jest` object as a global — it must be imported from @jest/globals.
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations (must come before all await imports) ───

jest.unstable_mockModule('../../repositories/PupilRepository.js', () => ({
  generatePupilIdCode:        jest.fn(),
  findContactPersonByPhone:   jest.fn(),
  createPupilTransaction:     jest.fn(),
  findBursarySchemeByName:    jest.fn(),
}));

jest.unstable_mockModule('../../integrations/photo.js', () => ({
  savePhoto:    jest.fn(),
  multerUpload: { single: jest.fn() },
}));

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    auditLog:   { create: jest.fn() },
    pupilPhoto: { create: jest.fn() },
    pupil:      { findUnique: jest.fn() },
  },
}));

// ── Module variables (populated in beforeAll) ─────────────────

let registerPupil;
let Repo;
let Photo;
let prismaModule;

// ── Shared fixtures ───────────────────────────────────────────

const PUPIL_ID         = 'pupil-uuid-abc123';
const CONTACT_PERSON_ID = 'cp-uuid-def456';
const SCHEME_ID        = 'scheme-uuid-ghi789';
const CREATED_BY       = 'admin-uuid-xyz';

const basePupilFields = {
  firstName:    'Jane',
  lastName:     'Nakato',
  dateOfBirth:  '2018-03-10',
  gender:       'Female',
  section:      'Day',
  enrolmentDate: '2026-01-15',
};

const baseContactPerson = {
  fullName:          'Sarah Nakato',
  relationship:      'Mother',
  primaryPhone:      '+256772123456',
  secondaryPhone:    null,
  whatsappIndicator: 'primary',
  email:             null,
  physicalAddress:   null,
};

/** Minimal pupil record returned by createPupilTransaction */
const mockPupil = {
  id:          PUPIL_ID,
  pupilIdCode: 'HPS-2026-0001',
  firstName:   'Jane',
  lastName:    'Nakato',
  section:     'Day',
  stream:      null,
  pupilParents:        [],
  pupilContactPersons: [{
    id:              'junc-uuid',
    contactPersonId: CONTACT_PERSON_ID,
    isPrimary:       true,
    contactPerson: {
      id:           CONTACT_PERSON_ID,
      fullName:     'Sarah Nakato',
      relationship: 'Mother',
      primaryPhone: '+256772123456',
    },
  }],
  pupilBursaries: [],
  pupilPhoto:     null,
  createdAt:      new Date('2026-03-15'),
};

const mockPupilWithPhoto = {
  ...mockPupil,
  pupilPhoto: { id: 'photo-uuid', filePath: 'photos/pupils/pupil-uuid-abc123.jpg' },
};

// ── Setup ─────────────────────────────────────────────────────

beforeAll(async () => {
  ({ registerPupil } = await import('../../services/PupilService.js'));
  Repo        = await import('../../repositories/PupilRepository.js');
  Photo       = await import('../../integrations/photo.js');
  prismaModule = await import('../../lib/prisma.js');
});

beforeEach(() => {
  jest.clearAllMocks();

  Repo.generatePupilIdCode.mockResolvedValue('HPS-2026-0001');
  Repo.findContactPersonByPhone.mockResolvedValue(null);  // no existing contact person
  Repo.createPupilTransaction.mockResolvedValue(mockPupil);
  Repo.findBursarySchemeByName.mockResolvedValue(null);

  prismaModule.prisma.auditLog.create.mockResolvedValue({});
  prismaModule.prisma.pupilPhoto.create.mockResolvedValue({ id: 'photo-uuid' });
  prismaModule.prisma.pupil.findUnique.mockResolvedValue(mockPupilWithPhoto);
});

// ── Helper ────────────────────────────────────────────────────

function makeParams(overrides = {}) {
  return {
    pupilFields:   basePupilFields,
    mother:        null,
    father:        null,
    contactPerson: baseContactPerson,
    bursaryFields: null,
    photoFile:     null,
    createdById:   CREATED_BY,
    ipAddress:     '127.0.0.1',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('PupilService.registerPupil', () => {

  // ── Pupil ID generation ──────────────────────────────────

  describe('pupil ID code', () => {
    test('calls generatePupilIdCode and uses result', async () => {
      Repo.generatePupilIdCode.mockResolvedValue('HPS-2026-0042');

      await registerPupil(makeParams());

      expect(Repo.generatePupilIdCode).toHaveBeenCalledTimes(1);
      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          pupilData: expect.objectContaining({ pupilIdCode: 'HPS-2026-0042' }),
        }),
      );
    });

    test('generated code follows HPS-YYYY-NNNN format', async () => {
      const result = await registerPupil(makeParams());
      expect(result.pupilIdCode).toMatch(/^HPS-\d{4}-\d{4}$/);
    });
  });

  // ── Contact person family linking ────────────────────────

  describe('contact person / family linking', () => {
    test('looks up contact person by primary phone', async () => {
      await registerPupil(makeParams());
      expect(Repo.findContactPersonByPhone).toHaveBeenCalledWith('+256772123456');
    });

    test('passes null existingContactPersonId and full contactPersonData when phone not found', async () => {
      Repo.findContactPersonByPhone.mockResolvedValue(null);

      await registerPupil(makeParams());

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          existingContactPersonId: null,
          contactPersonData: expect.objectContaining({
            fullName:     'Sarah Nakato',
            relationship: 'Mother',
            primaryPhone: '+256772123456',
          }),
        }),
      );
    });

    test('passes existingContactPersonId and null contactPersonData when phone matches (family link)', async () => {
      Repo.findContactPersonByPhone.mockResolvedValue({ id: CONTACT_PERSON_ID, fullName: 'Sarah Nakato' });

      await registerPupil(makeParams());

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          existingContactPersonId: CONTACT_PERSON_ID,
          contactPersonData:       null,
        }),
      );
    });

    test('second pupil with same primary phone links to existing contact person record', async () => {
      // First pupil — no existing contact person
      Repo.findContactPersonByPhone.mockResolvedValue(null);
      await registerPupil(makeParams());

      // Second pupil — contact person already exists
      Repo.findContactPersonByPhone.mockResolvedValue({ id: CONTACT_PERSON_ID });
      jest.clearAllMocks();
      Repo.generatePupilIdCode.mockResolvedValue('HPS-2026-0002');
      Repo.findContactPersonByPhone.mockResolvedValue({ id: CONTACT_PERSON_ID });
      Repo.createPupilTransaction.mockResolvedValue({ ...mockPupil, id: 'pupil-uuid-second', pupilIdCode: 'HPS-2026-0002' });
      prismaModule.prisma.auditLog.create.mockResolvedValue({});

      await registerPupil(makeParams({ pupilFields: { ...basePupilFields, firstName: 'John' } }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          existingContactPersonId: CONTACT_PERSON_ID,
          contactPersonData:       null,
        }),
      );
    });
  });

  // ── Mother / father optional parents ─────────────────────

  describe('optional mother and father', () => {
    test('creates pupil with contact person only (no mother or father)', async () => {
      await registerPupil(makeParams({ mother: null, father: null }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          motherData: null,
          fatherData: null,
        }),
      );
    });

    test('passes motherData when mother fullName is provided', async () => {
      const mother = { fullName: 'Mary Nakato', phone: '+256701111111', email: null, address: null, nin: null };

      await registerPupil(makeParams({ mother }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          motherData: expect.objectContaining({ fullName: 'Mary Nakato', phone: '+256701111111' }),
          fatherData: null,
        }),
      );
    });

    test('passes fatherData when father fullName is provided', async () => {
      const father = { fullName: 'John Nakato', phone: '+256702222222', email: null, address: null, nin: null };

      await registerPupil(makeParams({ father }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          motherData: null,
          fatherData: expect.objectContaining({ fullName: 'John Nakato' }),
        }),
      );
    });

    test('passes both motherData and fatherData when both provided', async () => {
      const mother = { fullName: 'Mary Nakato', phone: null, email: null, address: null, nin: null };
      const father = { fullName: 'John Nakato', phone: null, email: null, address: null, nin: null };

      await registerPupil(makeParams({ mother, father }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          motherData: expect.objectContaining({ fullName: 'Mary Nakato' }),
          fatherData: expect.objectContaining({ fullName: 'John Nakato' }),
        }),
      );
    });

    test('omits motherData when mother has no fullName', async () => {
      // mother object present but fullName empty/null
      await registerPupil(makeParams({ mother: { fullName: null, phone: null, email: null, address: null, nin: null } }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ motherData: null }),
      );
    });
  });

  // ── Transaction data shape ───────────────────────────────

  describe('transaction data shape', () => {
    test('passes correct pupil core fields', async () => {
      await registerPupil(makeParams());

      const { pupilData } = Repo.createPupilTransaction.mock.calls[0][0];
      expect(pupilData.firstName).toBe('Jane');
      expect(pupilData.lastName).toBe('Nakato');
      expect(pupilData.gender).toBe('Female');
      expect(pupilData.section).toBe('Day');
      expect(pupilData.createdById).toBe(CREATED_BY);
      expect(pupilData.dateOfBirth).toBeInstanceOf(Date);
    });

    test('photoData is always null in the transaction (photo written after)', async () => {
      await registerPupil(makeParams({ photoFile: { buffer: Buffer.from('img'), size: 1024 } }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ photoData: null }),
      );
    });

    test('returns the pupil record from the transaction', async () => {
      const result = await registerPupil(makeParams());
      expect(result).toEqual(mockPupil);
    });
  });

  // ── Bursary ──────────────────────────────────────────────

  describe('bursary', () => {
    const bursaryFields = {
      bursarySchemeName:   'Government Bursary',
      standardFeesAtAward: 600000,
      discountUgx:         200000,
    };

    test('skips bursary lookup when bursaryFields is null', async () => {
      await registerPupil(makeParams({ bursaryFields: null }));
      expect(Repo.findBursarySchemeByName).not.toHaveBeenCalled();
    });

    test('looks up scheme by name', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue({ id: SCHEME_ID, name: 'Government Bursary' });

      await registerPupil(makeParams({ bursaryFields }));

      expect(Repo.findBursarySchemeByName).toHaveBeenCalledWith('Government Bursary');
    });

    test('computes agreedNetFeesUgx = standard - discount', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue({ id: SCHEME_ID, name: 'Government Bursary' });

      await registerPupil(makeParams({ bursaryFields }));

      const { bursaryData } = Repo.createPupilTransaction.mock.calls[0][0];
      expect(bursaryData.agreedNetFeesUgx).toBe(400000);
      expect(bursaryData.standardFeesAtAward).toBe(600000);
      expect(bursaryData.discountUgx).toBe(200000);
      expect(bursaryData.bursarySchemeId).toBe(SCHEME_ID);
    });

    test('sets sectionAtAward from pupil section', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue({ id: SCHEME_ID });

      await registerPupil(makeParams({ bursaryFields }));

      const { bursaryData } = Repo.createPupilTransaction.mock.calls[0][0];
      expect(bursaryData.sectionAtAward).toBe('Day');
    });

    test('sets awardedById to the createdById', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue({ id: SCHEME_ID });

      await registerPupil(makeParams({ bursaryFields }));

      const { bursaryData } = Repo.createPupilTransaction.mock.calls[0][0];
      expect(bursaryData.awardedById).toBe(CREATED_BY);
    });

    test('throws 422 when scheme not found', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue(null);

      await expect(registerPupil(makeParams({ bursaryFields }))).rejects.toMatchObject({
        status:  422,
        message: expect.stringContaining('Government Bursary'),
      });
    });

    test('throws 422 when discount equals standard fees (agreedNetFeesUgx = 0)', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue({ id: SCHEME_ID });

      await expect(
        registerPupil(makeParams({
          bursaryFields: { ...bursaryFields, standardFeesAtAward: 200000, discountUgx: 200000 },
        })),
      ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('agreedNetFeesUgx') });
    });

    test('throws 422 when discount exceeds standard fees', async () => {
      Repo.findBursarySchemeByName.mockResolvedValue({ id: SCHEME_ID });

      await expect(
        registerPupil(makeParams({
          bursaryFields: { ...bursaryFields, standardFeesAtAward: 100000, discountUgx: 200000 },
        })),
      ).rejects.toMatchObject({ status: 422 });
    });

    test('passes null bursaryData to transaction when no bursary', async () => {
      await registerPupil(makeParams({ bursaryFields: null }));

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ bursaryData: null }),
      );
    });
  });

  // ── Photo handling ───────────────────────────────────────

  describe('photo', () => {
    const mockFile = { buffer: Buffer.from('fake-image-data'), size: 51200 };

    test('does not call savePhoto when no file is provided', async () => {
      await registerPupil(makeParams({ photoFile: null }));
      expect(Photo.savePhoto).not.toHaveBeenCalled();
    });

    test('calls savePhoto with buffer and pupil UUID', async () => {
      Photo.savePhoto.mockResolvedValue('photos/pupils/pupil-uuid-abc123.jpg');

      await registerPupil(makeParams({ photoFile: mockFile }));

      expect(Photo.savePhoto).toHaveBeenCalledWith(mockFile.buffer, PUPIL_ID);
    });

    test('creates pupilPhoto DB record with the returned file path', async () => {
      Photo.savePhoto.mockResolvedValue('photos/pupils/pupil-uuid-abc123.jpg');

      await registerPupil(makeParams({ photoFile: mockFile }));

      expect(prismaModule.prisma.pupilPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pupilId:      PUPIL_ID,
          filePath:     'photos/pupils/pupil-uuid-abc123.jpg',
          fileSizeBytes: 51200,
          uploadedById: CREATED_BY,
        }),
      });
    });

    test('re-fetches pupil with photo after saving', async () => {
      Photo.savePhoto.mockResolvedValue('photos/pupils/pupil-uuid-abc123.jpg');

      const result = await registerPupil(makeParams({ photoFile: mockFile }));

      expect(prismaModule.prisma.pupil.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PUPIL_ID } }),
      );
      expect(result.pupilPhoto).not.toBeNull();
    });

    test('photo failure is non-fatal — returns pupil without photo', async () => {
      Photo.savePhoto.mockRejectedValue(new Error('Sharp resize failed'));

      const result = await registerPupil(makeParams({ photoFile: mockFile }));

      expect(result.id).toBe(PUPIL_ID);
      expect(prismaModule.prisma.pupilPhoto.create).not.toHaveBeenCalled();
    });
  });

  // ── Audit log ────────────────────────────────────────────

  describe('audit log', () => {
    test('writes PUPIL_CREATED audit log after successful registration', async () => {
      await registerPupil(makeParams());

      expect(prismaModule.prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId:     CREATED_BY,
          action:     'PUPIL_CREATED',
          entityType: 'pupils',
          entityId:   PUPIL_ID,
          ipAddress:  '127.0.0.1',
        }),
      });
    });

    test('includes pupil name and ID code in audit notes', async () => {
      await registerPupil(makeParams());

      const { data } = prismaModule.prisma.auditLog.create.mock.calls[0][0];
      expect(data.notes).toContain('Jane Nakato');
      expect(data.notes).toContain('HPS-2026-0001');
    });
  });
});
