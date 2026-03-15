/**
 * AcademicCalendarService unit tests
 *
 * Covers:
 *   createAcademicYear
 *     - happy path (isCurrent=false)
 *     - isCurrent=true clears all others via transaction
 *     - endDate before startDate → 400
 *     - duplicate yearLabel → 409
 *
 *   updateAcademicYear
 *     - isCurrent=true triggers clear+update transaction
 *     - not found → 404
 *     - endDate before startDate after merge → 400
 *
 *   createTerm
 *     - happy path (isCurrent=false)
 *     - isCurrent=true clears current term in year via transaction
 *     - endDate before startDate → 400
 *     - duplicate termNumber in same year → 409
 *     - academic year not found → 404
 *
 *   updateTerm
 *     - isCurrent=true triggers clear+update transaction
 *     - not found → 404
 *
 *   deleteTerm
 *     - happy path
 *     - not found → 404
 */

import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations ────────────────────────────────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    // $transaction executes the callback with a mock tx object so repo calls inside still run
    $transaction: jest.fn((cb) => cb('mock-tx')),
  },
}));

jest.unstable_mockModule('../../repositories/AcademicCalendarRepository.js', () => ({
  findAllAcademicYears:     jest.fn(),
  findAcademicYearById:     jest.fn(),
  findAcademicYearByLabel:  jest.fn(),
  clearCurrentAcademicYears: jest.fn(),
  createAcademicYear:       jest.fn(),
  updateAcademicYear:       jest.fn(),
  findTermsByYear:          jest.fn(),
  findTermById:             jest.fn(),
  findTermByNumberInYear:   jest.fn(),
  clearCurrentTermsInYear:  jest.fn(),
  createTerm:               jest.fn(),
  updateTerm:               jest.fn(),
  deleteTerm:               jest.fn(),
}));

// ── Module variables (loaded after mocks) ─────────────────────

let service;
let Repo;
let prismaModule;

beforeAll(async () => {
  service     = await import('../../services/AcademicCalendarService.js');
  Repo        = await import('../../repositories/AcademicCalendarRepository.js');
  prismaModule = await import('../../lib/prisma.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────

const mockYear = () => ({
  id:         'year-1',
  yearLabel:  '2026',
  startDate:  new Date('2026-01-01'),
  endDate:    new Date('2026-12-31'),
  isCurrent:  false,
  _count:     { terms: 0 },
});

const mockTerm = () => ({
  id:            'term-1',
  academicYearId: 'year-1',
  termNumber:    1,
  termLabel:     'Term 1 2026',
  startDate:     new Date('2026-02-01'),
  endDate:       new Date('2026-04-30'),
  isCurrent:     false,
});

// ══════════════════════════════════════════════════════════════
// createAcademicYear
// ══════════════════════════════════════════════════════════════

describe('AcademicCalendarService.createAcademicYear', () => {
  test('creates a year with isCurrent=false without a transaction', async () => {
    Repo.findAcademicYearByLabel.mockResolvedValue(null);
    const created = { ...mockYear(), isCurrent: false };
    Repo.createAcademicYear.mockResolvedValue(created);

    const result = await service.createAcademicYear({
      yearLabel: '2026',
      startDate: '2026-01-01',
      endDate:   '2026-12-31',
      isCurrent: false,
    });

    expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled();
    expect(Repo.createAcademicYear).toHaveBeenCalledWith(
      expect.objectContaining({ yearLabel: '2026', isCurrent: false }),
      // no tx arg
    );
    expect(result).toEqual(created);
  });

  test('isCurrent=true clears all others and creates inside a transaction', async () => {
    Repo.findAcademicYearByLabel.mockResolvedValue(null);
    Repo.clearCurrentAcademicYears.mockResolvedValue({ count: 1 });
    const created = { ...mockYear(), isCurrent: true };
    Repo.createAcademicYear.mockResolvedValue(created);

    const result = await service.createAcademicYear({
      yearLabel: '2026',
      startDate: '2026-01-01',
      endDate:   '2026-12-31',
      isCurrent: true,
    });

    expect(prismaModule.prisma.$transaction).toHaveBeenCalledTimes(1);
    // clearCurrentAcademicYears must be called with the transaction client
    expect(Repo.clearCurrentAcademicYears).toHaveBeenCalledWith('mock-tx');
    // createAcademicYear must be called with the transaction client
    expect(Repo.createAcademicYear).toHaveBeenCalledWith(
      expect.objectContaining({ isCurrent: true }),
      'mock-tx',
    );
    expect(result).toEqual(created);
  });

  test('throws 400 when endDate is before startDate', async () => {
    await expect(
      service.createAcademicYear({
        yearLabel: '2025',
        startDate: '2025-12-31',
        endDate:   '2025-01-01',
      }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('endDate') });

    expect(Repo.createAcademicYear).not.toHaveBeenCalled();
  });

  test('throws 400 when endDate equals startDate', async () => {
    await expect(
      service.createAcademicYear({
        yearLabel: '2025',
        startDate: '2025-06-01',
        endDate:   '2025-06-01',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('throws 409 when yearLabel already exists', async () => {
    Repo.findAcademicYearByLabel.mockResolvedValue({ id: 'existing', yearLabel: '2026' });

    await expect(
      service.createAcademicYear({
        yearLabel: '2026',
        startDate: '2026-01-01',
        endDate:   '2026-12-31',
      }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('2026') });

    expect(Repo.createAcademicYear).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════
// updateAcademicYear
// ══════════════════════════════════════════════════════════════

describe('AcademicCalendarService.updateAcademicYear', () => {
  test('isCurrent=true clears all others and updates inside a transaction', async () => {
    Repo.findAcademicYearById.mockResolvedValue(mockYear());
    Repo.clearCurrentAcademicYears.mockResolvedValue({ count: 1 });
    const updated = { ...mockYear(), isCurrent: true };
    Repo.updateAcademicYear.mockResolvedValue(updated);

    const result = await service.updateAcademicYear('year-1', { isCurrent: true });

    expect(prismaModule.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(Repo.clearCurrentAcademicYears).toHaveBeenCalledWith('mock-tx');
    expect(Repo.updateAcademicYear).toHaveBeenCalledWith(
      'year-1',
      expect.objectContaining({ isCurrent: true }),
      'mock-tx',
    );
    expect(result).toEqual(updated);
  });

  test('throws 404 when academic year not found', async () => {
    Repo.findAcademicYearById.mockResolvedValue(null);

    await expect(service.updateAcademicYear('missing-id', { yearLabel: '2027' }))
      .rejects.toMatchObject({ status: 404 });
  });

  test('throws 400 when merged dates produce endDate <= startDate', async () => {
    Repo.findAcademicYearById.mockResolvedValue({
      ...mockYear(),
      startDate: new Date('2026-06-01'),
      endDate:   new Date('2026-12-31'),
    });

    await expect(
      service.updateAcademicYear('year-1', { endDate: '2026-05-01' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('updates without transaction when isCurrent is not set', async () => {
    Repo.findAcademicYearById.mockResolvedValue(mockYear());
    Repo.findAcademicYearByLabel.mockResolvedValue(null); // '2027' does not exist yet
    const updated = { ...mockYear(), yearLabel: '2027' };
    Repo.updateAcademicYear.mockResolvedValue(updated);

    await service.updateAcademicYear('year-1', { yearLabel: '2027' });

    expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled();
    expect(Repo.updateAcademicYear).toHaveBeenCalledWith(
      'year-1',
      expect.objectContaining({ yearLabel: '2027' }),
      // no tx arg
    );
  });
});

// ══════════════════════════════════════════════════════════════
// createTerm
// ══════════════════════════════════════════════════════════════

describe('AcademicCalendarService.createTerm', () => {
  test('creates a term with isCurrent=false without a transaction', async () => {
    Repo.findAcademicYearById.mockResolvedValue(mockYear());
    Repo.findTermByNumberInYear.mockResolvedValue(null);
    const created = mockTerm();
    Repo.createTerm.mockResolvedValue(created);

    const result = await service.createTerm({
      academicYearId: 'year-1',
      termNumber:     1,
      termLabel:      'Term 1 2026',
      startDate:      '2026-02-01',
      endDate:        '2026-04-30',
      isCurrent:      false,
    });

    expect(prismaModule.prisma.$transaction).not.toHaveBeenCalled();
    expect(Repo.createTerm).toHaveBeenCalledWith(
      expect.objectContaining({ termNumber: 1, isCurrent: false }),
      // no tx arg
    );
    expect(result).toEqual(created);
  });

  test('isCurrent=true clears current term in the same year inside a transaction', async () => {
    Repo.findAcademicYearById.mockResolvedValue(mockYear());
    Repo.findTermByNumberInYear.mockResolvedValue(null);
    Repo.clearCurrentTermsInYear.mockResolvedValue({ count: 1 });
    const created = { ...mockTerm(), isCurrent: true };
    Repo.createTerm.mockResolvedValue(created);

    const result = await service.createTerm({
      academicYearId: 'year-1',
      termNumber:     1,
      termLabel:      'Term 1 2026',
      startDate:      '2026-02-01',
      endDate:        '2026-04-30',
      isCurrent:      true,
    });

    expect(prismaModule.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(Repo.clearCurrentTermsInYear).toHaveBeenCalledWith('year-1', 'mock-tx');
    expect(Repo.createTerm).toHaveBeenCalledWith(
      expect.objectContaining({ isCurrent: true }),
      'mock-tx',
    );
    expect(result.isCurrent).toBe(true);
  });

  test('throws 400 when endDate is before startDate', async () => {
    Repo.findAcademicYearById.mockResolvedValue(mockYear());

    await expect(
      service.createTerm({
        academicYearId: 'year-1',
        termNumber:     1,
        termLabel:      'Term 1 2026',
        startDate:      '2026-04-30',
        endDate:        '2026-02-01',
      }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('endDate') });

    expect(Repo.createTerm).not.toHaveBeenCalled();
  });

  test('throws 409 when termNumber already exists in the year', async () => {
    Repo.findAcademicYearById.mockResolvedValue(mockYear());
    Repo.findTermByNumberInYear.mockResolvedValue({ id: 'existing-term', termNumber: 1 });

    await expect(
      service.createTerm({
        academicYearId: 'year-1',
        termNumber:     1,
        termLabel:      'Term 1 2026',
        startDate:      '2026-02-01',
        endDate:        '2026-04-30',
      }),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('Term 1') });

    expect(Repo.createTerm).not.toHaveBeenCalled();
  });

  test('throws 404 when academic year does not exist', async () => {
    Repo.findAcademicYearById.mockResolvedValue(null);

    await expect(
      service.createTerm({
        academicYearId: 'bad-year',
        termNumber:     1,
        termLabel:      'Term 1',
        startDate:      '2026-02-01',
        endDate:        '2026-04-30',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ══════════════════════════════════════════════════════════════
// updateTerm
// ══════════════════════════════════════════════════════════════

describe('AcademicCalendarService.updateTerm', () => {
  test('isCurrent=true clears others in the same year and updates inside a transaction', async () => {
    Repo.findTermById.mockResolvedValue(mockTerm());
    Repo.clearCurrentTermsInYear.mockResolvedValue({ count: 1 });
    const updated = { ...mockTerm(), isCurrent: true };
    Repo.updateTerm.mockResolvedValue(updated);

    await service.updateTerm('term-1', { isCurrent: true });

    expect(prismaModule.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(Repo.clearCurrentTermsInYear).toHaveBeenCalledWith('year-1', 'mock-tx');
    expect(Repo.updateTerm).toHaveBeenCalledWith(
      'term-1',
      expect.objectContaining({ isCurrent: true }),
      'mock-tx',
    );
  });

  test('throws 404 when term not found', async () => {
    Repo.findTermById.mockResolvedValue(null);

    await expect(service.updateTerm('missing', { termLabel: 'X' }))
      .rejects.toMatchObject({ status: 404 });
  });

  test('throws 400 when merged dates produce endDate <= startDate', async () => {
    Repo.findTermById.mockResolvedValue({
      ...mockTerm(),
      startDate: new Date('2026-02-01'),
      endDate:   new Date('2026-04-30'),
    });

    await expect(service.updateTerm('term-1', { endDate: '2026-01-01' }))
      .rejects.toMatchObject({ status: 400 });
  });
});

// ══════════════════════════════════════════════════════════════
// deleteTerm
// ══════════════════════════════════════════════════════════════

describe('AcademicCalendarService.deleteTerm', () => {
  test('deletes a term that exists', async () => {
    Repo.findTermById.mockResolvedValue(mockTerm());
    Repo.deleteTerm.mockResolvedValue({});

    await service.deleteTerm('term-1');

    expect(Repo.deleteTerm).toHaveBeenCalledWith('term-1');
  });

  test('throws 404 when term not found', async () => {
    Repo.findTermById.mockResolvedValue(null);

    await expect(service.deleteTerm('missing'))
      .rejects.toMatchObject({ status: 404 });

    expect(Repo.deleteTerm).not.toHaveBeenCalled();
  });
});
