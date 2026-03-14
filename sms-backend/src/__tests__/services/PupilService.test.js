/**
 * PupilService unit tests
 *
 * All external dependencies (PupilRepository, photo adapter, Prisma) are mocked
 * so these tests exercise the business logic in isolation.
 *
 * ESM note: In ESM mode (--experimental-vm-modules) Jest does not inject the
 * `jest` object as a global — it must be imported from @jest/globals.
 * Static imports are resolved before the module body runs, so jest is available
 * when jest.unstable_mockModule() is called in the module body below.
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations (must come before all await imports) ───

jest.unstable_mockModule('../../repositories/PupilRepository.js', () => ({
  generatePupilIdCode:      jest.fn(),
  findGuardianByPhone:      jest.fn(),
  createPupilTransaction:   jest.fn(),
  findBursarySchemeByName:  jest.fn(),
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
let Repo;        // PupilRepository module
let Photo;       // photo integration module
let prismaModule;

// ── Shared fixtures ───────────────────────────────────────────

const PUPIL_ID    = 'pupil-uuid-abc123';
const GUARDIAN_ID = 'guardian-uuid-def456';
const SCHEME_ID   = 'scheme-uuid-ghi789';
const CREATED_BY  = 'admin-uuid-xyz';

const basePupilFields = {
  firstName:    'Jane',
  lastName:     'Nakato',
  dateOfBirth:  '2018-03-10',
  gender:       'Female',
  section:      'Day',
  enrolmentDate: '2026-01-15',
};

const baseGuardianFields = {
  fullName:     'Sarah Nakato',
  relationship: 'Mother',
  phoneCall:    '+256772123456',
};

/** Minimal pupil record returned by createPupilTransaction */
const mockPupil = {
  id:          PUPIL_ID,
  pupilIdCode: 'HPS-2026-0001',
  firstName:   'Jane',
  lastName:    'Nakato',
  section:     'Day',
  stream:      null,
  pupilGuardians: [{
    id:              'junc-uuid',
    guardianId:      GUARDIAN_ID,
    isPrimaryContact: true,
    guardian: {
      id:           GUARDIAN_ID,
      fullName:     'Sarah Nakato',
      relationship: 'Mother',
      phoneCall:    '+256772123456',
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

  // Default happy-path mock returns
  Repo.generatePupilIdCode.mockResolvedValue('HPS-2026-0001');
  Repo.findGuardianByPhone.mockResolvedValue(null);            // no existing guardian
  Repo.createPupilTransaction.mockResolvedValue(mockPupil);
  Repo.findBursarySchemeByName.mockResolvedValue(null);

  prismaModule.prisma.auditLog.create.mockResolvedValue({});
  prismaModule.prisma.pupilPhoto.create.mockResolvedValue({ id: 'photo-uuid' });
  prismaModule.prisma.pupil.findUnique.mockResolvedValue(mockPupilWithPhoto);
});

// ── Helper ────────────────────────────────────────────────────

function makeParams(overrides = {}) {
  return {
    pupilFields:    basePupilFields,
    guardianFields: baseGuardianFields,
    bursaryFields:  null,
    photoFile:      null,
    createdById:    CREATED_BY,
    ipAddress:      '127.0.0.1',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('PupilService.registerPupil', () => {

  // ── Pupil ID generation ──────────────────────────────────

  describe('pupil ID code', () => {
    test('calls generatePupilIdCode and uses result', async () => {
      Repo.generatePupilIdCode.mockResolvedValue('HPS-2026-0042');

      const pupil = await registerPupil(makeParams());

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

  // ── Guardian deduplication ───────────────────────────────

  describe('guardian handling', () => {
    test('looks up guardian by phone number', async () => {
      await registerPupil(makeParams());
      expect(Repo.findGuardianByPhone).toHaveBeenCalledWith('+256772123456');
    });

    test('passes null existingGuardianId and full guardianData when phone not found', async () => {
      Repo.findGuardianByPhone.mockResolvedValue(null);

      await registerPupil(makeParams());

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          existingGuardianId: null,
          guardianData: expect.objectContaining({
            fullName:     'Sarah Nakato',
            relationship: 'Mother',
            phoneCall:    '+256772123456',
          }),
        }),
      );
    });

    test('passes existingGuardianId and null guardianData when phone matches', async () => {
      Repo.findGuardianByPhone.mockResolvedValue({ id: GUARDIAN_ID, fullName: 'Sarah Nakato' });

      await registerPupil(makeParams());

      expect(Repo.createPupilTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          existingGuardianId: GUARDIAN_ID,
          guardianData:       null,
        }),
      );
    });
  });

  // ── Transaction call ─────────────────────────────────────

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
      expect(bursaryData.agreedNetFeesUgx).toBe(400000); // 600000 - 200000
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
        message: expect.stringContaining("Government Bursary"),
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

    test('throws 422 when discount exceeds standard fees (agreedNetFeesUgx < 0)', async () => {
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

      // Pupil is still returned (from the transaction result, before photo step)
      expect(result.id).toBe(PUPIL_ID);
      // DB photo record was never created
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
