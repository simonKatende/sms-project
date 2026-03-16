import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// Mock registrations MUST come before all imports
jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    assessmentTypeConfig: {
      findMany:  jest.fn(),
      findUnique: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
    reportCardSetting: {
      findFirst: jest.fn(),
      create:    jest.fn(),
      update:    jest.fn(),
    },
  },
}));

let Service;
let prismaModule;

beforeAll(async () => {
  prismaModule = await import('../../lib/prisma.js');
  Service      = await import('../../services/ReportCardConfigService.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Assessment Types ───────────────────────────────────────────

describe('listAssessmentTypes', () => {
  test('returns active types ordered by displayOrder', async () => {
    const mockTypes = [
      { id: 'uuid-1', code: 'BOT', label: 'Beginning of Term', displayOrder: 1, isSystemDefault: true, isActive: true },
      { id: 'uuid-2', code: 'MOT', label: 'Middle of Term',    displayOrder: 2, isSystemDefault: true, isActive: true },
    ];
    prismaModule.prisma.assessmentTypeConfig.findMany.mockResolvedValue(mockTypes);

    const result = await Service.listAssessmentTypes();

    expect(result).toEqual(mockTypes);
    expect(prismaModule.prisma.assessmentTypeConfig.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   { isActive: true },
        orderBy: { displayOrder: 'asc' },
      }),
    );
  });
});

describe('createAssessmentType', () => {
  test('creates a new custom type with isSystemDefault=false and contributesToAggregate=false', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue(null);
    const created = {
      id: 'uuid-new', code: 'MOCK', label: 'PLE Mock', appearsOnReportCard: true,
      contributesToAggregate: false, displayOrder: 5, isSystemDefault: false, isActive: true,
    };
    prismaModule.prisma.assessmentTypeConfig.create.mockResolvedValue(created);

    const result = await Service.createAssessmentType({
      code: 'MOCK', label: 'PLE Mock', appearsOnReportCard: true, displayOrder: 5,
    });

    expect(result).toEqual(created);
    expect(prismaModule.prisma.assessmentTypeConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code:                   'MOCK',
          label:                  'PLE Mock',
          isSystemDefault:        false,
          contributesToAggregate: false,
        }),
      }),
    );
  });

  test('throws 409 if code already exists', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue({ id: 'existing', code: 'BOT' });

    await expect(Service.createAssessmentType({
      code: 'BOT', label: 'Duplicate', appearsOnReportCard: true, displayOrder: 1,
    })).rejects.toMatchObject({ status: 409 });
  });
});

describe('updateAssessmentType', () => {
  test('updates a non-system-default type', async () => {
    const existing = { id: 'uuid-custom', code: 'MOCK', isSystemDefault: false };
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue(existing);
    const updated = { ...existing, label: 'PLE Mock Updated' };
    prismaModule.prisma.assessmentTypeConfig.update.mockResolvedValue(updated);

    const result = await Service.updateAssessmentType('uuid-custom', { label: 'PLE Mock Updated' });

    expect(result).toEqual(updated);
    expect(prismaModule.prisma.assessmentTypeConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'uuid-custom' },
        data:  expect.objectContaining({ label: 'PLE Mock Updated' }),
      }),
    );
  });

  test('throws 403 when attempting to modify a system default type', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue({
      id: 'uuid-bot', code: 'BOT', isSystemDefault: true,
    });

    await expect(
      Service.updateAssessmentType('uuid-bot', { label: 'Renamed BOT' }),
    ).rejects.toMatchObject({ status: 403, message: 'Cannot modify system defaults' });

    // update must NOT be called
    expect(prismaModule.prisma.assessmentTypeConfig.update).not.toHaveBeenCalled();
  });

  test('throws 404 when type does not exist', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue(null);

    await expect(
      Service.updateAssessmentType('non-existent', { label: 'X' }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('deactivateAssessmentType', () => {
  test('sets isActive=false on a non-system-default type', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue({
      id: 'uuid-custom', isSystemDefault: false,
    });
    prismaModule.prisma.assessmentTypeConfig.update.mockResolvedValue({
      id: 'uuid-custom', isActive: false,
    });

    const result = await Service.deactivateAssessmentType('uuid-custom');

    expect(result.isActive).toBe(false);
    expect(prismaModule.prisma.assessmentTypeConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } }),
    );
  });

  test('throws 403 when attempting to deactivate a system default type', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue({
      id: 'uuid-eot', code: 'EOT', isSystemDefault: true,
    });

    await expect(
      Service.deactivateAssessmentType('uuid-eot'),
    ).rejects.toMatchObject({ status: 403, message: 'Cannot deactivate system defaults' });

    expect(prismaModule.prisma.assessmentTypeConfig.update).not.toHaveBeenCalled();
  });

  test('throws 404 when type does not exist', async () => {
    prismaModule.prisma.assessmentTypeConfig.findUnique.mockResolvedValue(null);

    await expect(
      Service.deactivateAssessmentType('non-existent'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── Report Card Settings ───────────────────────────────────────

describe('getReportCardSettings', () => {
  test('returns the settings row when it exists', async () => {
    const settings = { id: 'settings-1', showBotOnReport: true, showMotOnReport: true };
    prismaModule.prisma.reportCardSetting.findFirst.mockResolvedValue(settings);

    const result = await Service.getReportCardSettings();

    expect(result).toEqual(settings);
  });

  test('returns null when no settings row exists', async () => {
    prismaModule.prisma.reportCardSetting.findFirst.mockResolvedValue(null);

    const result = await Service.getReportCardSettings();

    expect(result).toBeNull();
  });
});

describe('upsertReportCardSettings', () => {
  test('creates a new row when none exists', async () => {
    prismaModule.prisma.reportCardSetting.findFirst.mockResolvedValue(null);
    const created = {
      id: 'uuid-settings', showBotOnReport: true, showMotOnReport: false,
      showEotOnReport: true, whoCanGenerate: 'dos_only',
    };
    prismaModule.prisma.reportCardSetting.create.mockResolvedValue(created);

    const result = await Service.upsertReportCardSettings(
      { showBot: true, showMot: false, showEot: true, whoCanGenerate: 'dos_only' },
      'user-id',
    );

    expect(result).toEqual(created);
    expect(prismaModule.prisma.reportCardSetting.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          showBotOnReport: true,
          showMotOnReport: false,
          showEotOnReport: true,
          whoCanGenerate:  'dos_only',
          updatedById:     'user-id',
        }),
      }),
    );
    expect(prismaModule.prisma.reportCardSetting.update).not.toHaveBeenCalled();
  });

  test('updates the existing row when one exists', async () => {
    const existing = { id: 'uuid-settings', showBotOnReport: true };
    prismaModule.prisma.reportCardSetting.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, showClassRank: false };
    prismaModule.prisma.reportCardSetting.update.mockResolvedValue(updated);

    const result = await Service.upsertReportCardSettings(
      { showClassRank: false },
      'user-id',
    );

    expect(result).toEqual(updated);
    expect(prismaModule.prisma.reportCardSetting.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'uuid-settings' },
        data:  expect.objectContaining({ showClassRank: false }),
      }),
    );
    expect(prismaModule.prisma.reportCardSetting.create).not.toHaveBeenCalled();
  });

  test('maps showBot/showMot/showEot to DB field names', async () => {
    prismaModule.prisma.reportCardSetting.findFirst.mockResolvedValue(null);
    prismaModule.prisma.reportCardSetting.create.mockResolvedValue({ id: 'new' });

    await Service.upsertReportCardSettings({ showBot: false, showMot: true, showEot: false });

    expect(prismaModule.prisma.reportCardSetting.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          showBotOnReport: false,
          showMotOnReport: true,
          showEotOnReport: false,
        }),
      }),
    );
  });

  test('only includes provided fields in the update data', async () => {
    prismaModule.prisma.reportCardSetting.findFirst.mockResolvedValue({ id: 'uuid-settings' });
    prismaModule.prisma.reportCardSetting.update.mockResolvedValue({ id: 'uuid-settings' });

    await Service.upsertReportCardSettings({ rankingFormat: '1st' }, undefined);

    const callArgs = prismaModule.prisma.reportCardSetting.update.mock.calls[0][0];
    expect(callArgs.data).toHaveProperty('rankingFormat', '1st');
    expect(callArgs.data).not.toHaveProperty('showBotOnReport');
    expect(callArgs.data).not.toHaveProperty('updatedById');
  });
});
