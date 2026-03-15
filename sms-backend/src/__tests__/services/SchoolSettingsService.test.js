/**
 * SchoolSettingsService unit tests
 *
 * Covers:
 *   - getProfile: returns default when no row exists
 *   - getProfile: returns row + logoUrl when row exists
 *   - updateProfile: creates new row when none exists
 *   - updateProfile: updates existing row
 *   - updateProfile: saves logo and sets logoPath
 *   - updateProfile: preserves existing logoPath when no new logo file
 *   - updateProfile: parses invoiceFineAfterDueDate as integer
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations ────────────────────────────────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    schoolSetting: {
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
  },
}));

jest.unstable_mockModule('../../integrations/logo.js', () => ({
  saveLogo:   jest.fn(),
  logoUpload: { single: jest.fn() },
}));

// ── Module variables ──────────────────────────────────────────

let getProfile;
let updateProfile;
let prismaModule;
let LogoAdapter;

// ── Fixtures ──────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000';

const existingRow = {
  id:                     'settings-uuid',
  schoolName:             'Highfield Primary School',
  schoolMotto:            'Excellence in Education',
  addressLine1:           '123 Kampala Rd',
  addressLine2:           null,
  phonePrimary:           '+256772000001',
  phoneSecondary:         null,
  email:                  'info@highfield.ug',
  website:                null,
  logoPath:               'logos/school-logo.png',
  mobileMoneyMtn:         null,
  mobileMoneyAirtel:      null,
  mobileMoneyAccountName: null,
  invoiceFineAfterDueDate: null,
  createdAt:              new Date(),
  updatedAt:              new Date(),
};

// ── Setup ─────────────────────────────────────────────────────

beforeAll(async () => {
  ({ getProfile, updateProfile } = await import('../../services/SchoolSettingsService.js'));
  prismaModule = await import('../../lib/prisma.js');
  LogoAdapter  = await import('../../integrations/logo.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────

describe('SchoolSettingsService.getProfile', () => {

  test('returns sensible defaults when no row exists', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(null);

    const result = await getProfile(BASE_URL);

    expect(result.schoolName).toBe('Highfield Primary School');
    expect(result.logoUrl).toBeNull();
    expect(result.logoPath).toBeNull();
  });

  test('returns full row + constructed logoUrl when row exists', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);

    const result = await getProfile(BASE_URL);

    expect(result.schoolName).toBe('Highfield Primary School');
    expect(result.logoUrl).toBe('http://localhost:3000/storage/logos/school-logo.png');
    expect(result.logoPath).toBe('logos/school-logo.png');
    expect(result.email).toBe('info@highfield.ug');
  });

  test('logoUrl is null when logoPath is null', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue({ ...existingRow, logoPath: null });

    const result = await getProfile(BASE_URL);

    expect(result.logoUrl).toBeNull();
  });
});

describe('SchoolSettingsService.updateProfile', () => {

  const baseFields = {
    schoolName:   'Highfield Primary School',
    primaryPhone: '+256772000001',
    email:        'info@highfield.ug',
  };

  test('creates a new row when no existing row found', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(null);
    prismaModule.prisma.schoolSetting.create.mockResolvedValue({
      ...existingRow,
      logoPath: null,
    });

    await updateProfile({ fields: baseFields, logoFile: null, baseUrl: BASE_URL });

    expect(prismaModule.prisma.schoolSetting.create).toHaveBeenCalledTimes(1);
    expect(prismaModule.prisma.schoolSetting.update).not.toHaveBeenCalled();
  });

  test('updates the existing row when one exists', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);
    prismaModule.prisma.schoolSetting.update.mockResolvedValue(existingRow);

    await updateProfile({ fields: baseFields, logoFile: null, baseUrl: BASE_URL });

    expect(prismaModule.prisma.schoolSetting.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'settings-uuid' } }),
    );
    expect(prismaModule.prisma.schoolSetting.create).not.toHaveBeenCalled();
  });

  test('saves logo and includes logoPath in upsert data when file provided', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);
    prismaModule.prisma.schoolSetting.update.mockResolvedValue({
      ...existingRow,
      logoPath: 'logos/school-logo.png',
    });
    LogoAdapter.saveLogo.mockResolvedValue('logos/school-logo.png');

    const logoFile = { buffer: Buffer.from('fake-png'), mimetype: 'image/png' };
    await updateProfile({ fields: baseFields, logoFile, baseUrl: BASE_URL });

    expect(LogoAdapter.saveLogo).toHaveBeenCalledWith(logoFile.buffer, 'image/png');

    const updateCall = prismaModule.prisma.schoolSetting.update.mock.calls[0][0];
    expect(updateCall.data.logoPath).toBe('logos/school-logo.png');
  });

  test('does not call saveLogo and omits logoPath when no file provided', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);
    prismaModule.prisma.schoolSetting.update.mockResolvedValue(existingRow);

    await updateProfile({ fields: baseFields, logoFile: null, baseUrl: BASE_URL });

    expect(LogoAdapter.saveLogo).not.toHaveBeenCalled();

    const updateCall = prismaModule.prisma.schoolSetting.update.mock.calls[0][0];
    expect(updateCall.data.logoPath).toBeUndefined();
  });

  test('parses invoiceFineAfterDueDate string to integer', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);
    prismaModule.prisma.schoolSetting.update.mockResolvedValue(existingRow);

    await updateProfile({
      fields:   { ...baseFields, invoiceFineAfterDueDate: '5000' },
      logoFile: null,
      baseUrl:  BASE_URL,
    });

    const updateCall = prismaModule.prisma.schoolSetting.update.mock.calls[0][0];
    expect(updateCall.data.invoiceFineAfterDueDate).toBe(5000);
  });

  test('sets invoiceFineAfterDueDate to null when not provided', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);
    prismaModule.prisma.schoolSetting.update.mockResolvedValue(existingRow);

    await updateProfile({ fields: baseFields, logoFile: null, baseUrl: BASE_URL });

    const updateCall = prismaModule.prisma.schoolSetting.update.mock.calls[0][0];
    expect(updateCall.data.invoiceFineAfterDueDate).toBeNull();
  });

  test('returns updated row with logoUrl in response', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(existingRow);
    prismaModule.prisma.schoolSetting.update.mockResolvedValue(existingRow);

    const result = await updateProfile({ fields: baseFields, logoFile: null, baseUrl: BASE_URL });

    expect(result.logoUrl).toBe('http://localhost:3000/storage/logos/school-logo.png');
  });

  test('maps primaryPhone/secondaryPhone fields to phonePrimary/phoneSecondary columns', async () => {
    prismaModule.prisma.schoolSetting.findFirst.mockResolvedValue(null);
    prismaModule.prisma.schoolSetting.create.mockResolvedValue({ ...existingRow, logoPath: null });

    await updateProfile({
      fields:   { ...baseFields, primaryPhone: '+256701111111', secondaryPhone: '+256702222222' },
      logoFile: null,
      baseUrl:  BASE_URL,
    });

    const createCall = prismaModule.prisma.schoolSetting.create.mock.calls[0][0];
    expect(createCall.data.phonePrimary).toBe('+256701111111');
    expect(createCall.data.phoneSecondary).toBe('+256702222222');
  });
});
