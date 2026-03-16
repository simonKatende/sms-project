import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

// ── Mock registrations (must precede all imports) ─────────────

jest.unstable_mockModule('../../lib/prisma.js', () => ({
  prisma: {
    schoolSection: {
      findUnique: jest.fn(),
    },
    subject: {
      findUnique: jest.fn(),
    },
    subjectSectionRule: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      upsert:     jest.fn(),
      update:     jest.fn(),
    },
    gradingScale: {
      findFirst: jest.fn(),
    },
    gradingScaleEntry: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      update:     jest.fn(),
    },
    divisionBoundary: {
      findUnique: jest.fn(),
      findMany:   jest.fn(),
      update:     jest.fn(),
    },
    term: {
      findFirst: jest.fn(),
    },
    pupilScore: {
      count: jest.fn(),
    },
  },
}));

// ── Lazy imports ──────────────────────────────────────────────

let svc;
let prismaModule;

beforeAll(async () => {
  prismaModule = await import('../../lib/prisma.js');
  svc          = await import('../../services/GradingConfigService.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Fixtures ──────────────────────────────────────────────────

/** Standard Uganda MoES 9-point grade bands (D1–F9) */
const ALL_GRADE_ENTRIES = [
  { id: 'd1', gradingScaleId: 'scale-uuid', gradeLabel: 'D1', minScore: 90, maxScore: 100, pointsValue: 1, displayOrder: 1 },
  { id: 'd2', gradingScaleId: 'scale-uuid', gradeLabel: 'D2', minScore: 80, maxScore: 89,  pointsValue: 2, displayOrder: 2 },
  { id: 'c3', gradingScaleId: 'scale-uuid', gradeLabel: 'C3', minScore: 75, maxScore: 79,  pointsValue: 3, displayOrder: 3 },
  { id: 'c4', gradingScaleId: 'scale-uuid', gradeLabel: 'C4', minScore: 70, maxScore: 74,  pointsValue: 4, displayOrder: 4 },
  { id: 'c5', gradingScaleId: 'scale-uuid', gradeLabel: 'C5', minScore: 60, maxScore: 69,  pointsValue: 5, displayOrder: 5 },
  { id: 'c6', gradingScaleId: 'scale-uuid', gradeLabel: 'C6', minScore: 50, maxScore: 59,  pointsValue: 6, displayOrder: 6 },
  { id: 'p7', gradingScaleId: 'scale-uuid', gradeLabel: 'P7', minScore: 40, maxScore: 49,  pointsValue: 7, displayOrder: 7 },
  { id: 'p8', gradingScaleId: 'scale-uuid', gradeLabel: 'P8', minScore: 30, maxScore: 39,  pointsValue: 8, displayOrder: 8 },
  { id: 'f9', gradingScaleId: 'scale-uuid', gradeLabel: 'F9', minScore: 0,  maxScore: 29,  pointsValue: 9, displayOrder: 9, isFail: true },
];

/** All other entries when the target entry is excluded */
function siblingsExcluding(targetId) {
  return ALL_GRADE_ENTRIES.filter(e => e.id !== targetId);
}

/** Standard division boundaries */
const ALL_DIVISION_BOUNDARIES = [
  { id: 'div1', gradingScaleId: 'scale-uuid', divisionLabel: 'Division I',   romanNumeral: 'I',   minAggregate: 4,  maxAggregate: 12, displayOrder: 1 },
  { id: 'div2', gradingScaleId: 'scale-uuid', divisionLabel: 'Division II',  romanNumeral: 'II',  minAggregate: 13, maxAggregate: 23, displayOrder: 2 },
  { id: 'div3', gradingScaleId: 'scale-uuid', divisionLabel: 'Division III', romanNumeral: 'III', minAggregate: 24, maxAggregate: 29, displayOrder: 3 },
  { id: 'div4', gradingScaleId: 'scale-uuid', divisionLabel: 'Division IV',  romanNumeral: 'IV',  minAggregate: 30, maxAggregate: 34, displayOrder: 4 },
  { id: 'divu', gradingScaleId: 'scale-uuid', divisionLabel: 'Ungraded',     romanNumeral: 'U',   minAggregate: 35, maxAggregate: 36, displayOrder: 5 },
];

function divSiblingsExcluding(targetId) {
  return ALL_DIVISION_BOUNDARIES.filter(b => b.id !== targetId);
}

// ── upsertSectionRule ─────────────────────────────────────────

describe('upsertSectionRule', () => {
  test('happy path — creates or updates a section rule', async () => {
    const section = { id: 'section-uuid', name: 'Lower Primary' };
    const subject = { id: 'sub-uuid', name: 'Mathematics' };
    const rule    = { id: 'rule-uuid', schoolSectionId: 'section-uuid', subjectId: 'sub-uuid', includeInAggregate: true, isPenaltyTrigger: true };

    prismaModule.prisma.schoolSection.findUnique.mockResolvedValue(section);
    prismaModule.prisma.subject.findUnique.mockResolvedValue(subject);
    prismaModule.prisma.subjectSectionRule.upsert.mockResolvedValue({ ...rule, subject });

    const result = await svc.upsertSectionRule({
      schoolSectionId: 'section-uuid',
      subjectId:       'sub-uuid',
      includeInAggregate: true,
      isPenaltyTrigger:   true,
    });

    expect(result).toMatchObject({ schoolSectionId: 'section-uuid', subjectId: 'sub-uuid' });
    expect(prismaModule.prisma.subjectSectionRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { schoolSectionId_subjectId: { schoolSectionId: 'section-uuid', subjectId: 'sub-uuid' } },
        update: { includeInAggregate: true, isPenaltyTrigger: true },
      }),
    );
  });

  test('throws 404 when school section not found', async () => {
    prismaModule.prisma.schoolSection.findUnique.mockResolvedValue(null);

    await expect(
      svc.upsertSectionRule({ schoolSectionId: 'bad-uuid', subjectId: 'sub-uuid', includeInAggregate: true, isPenaltyTrigger: false }),
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('section') });
  });

  test('throws 404 when subject not found', async () => {
    prismaModule.prisma.schoolSection.findUnique.mockResolvedValue({ id: 'section-uuid' });
    prismaModule.prisma.subject.findUnique.mockResolvedValue(null);

    await expect(
      svc.upsertSectionRule({ schoolSectionId: 'section-uuid', subjectId: 'bad-uuid', includeInAggregate: true, isPenaltyTrigger: false }),
    ).rejects.toMatchObject({ status: 404, message: expect.stringContaining('Subject') });
  });
});

// ── getActiveGradingScale ─────────────────────────────────────

describe('getActiveGradingScale', () => {
  test('returns active scale with entries and boundaries', async () => {
    const scale = {
      id: 'scale-uuid',
      name: 'Standard Uganda MoES Scale',
      isActive: true,
      gradingScaleEntries: ALL_GRADE_ENTRIES,
      divisionBoundaries:  ALL_DIVISION_BOUNDARIES,
    };
    prismaModule.prisma.gradingScale.findFirst.mockResolvedValue(scale);

    const result = await svc.getActiveGradingScale();

    expect(result.gradingScaleEntries).toHaveLength(9);
    expect(result.divisionBoundaries).toHaveLength(5);
  });

  test('throws 404 when no active scale exists', async () => {
    prismaModule.prisma.gradingScale.findFirst.mockResolvedValue(null);

    await expect(svc.getActiveGradingScale()).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateGradeEntry ─── grade band validation ─────────────────

describe('updateGradeEntry', () => {
  // ── happy path ────────────────────────────────────────────

  test('score exactly on boundary: D2 ends at 89, D1 starts at 90 — valid', async () => {
    // The standard seeded configuration is: D1(90-100), D2(80-89), … contiguous.
    // Updating D1 to its current values should pass all validation.
    const d1 = ALL_GRADE_ENTRIES.find(e => e.id === 'd1');

    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(d1);
    prismaModule.prisma.gradingScaleEntry.findMany.mockResolvedValue(siblingsExcluding('d1'));
    prismaModule.prisma.gradingScaleEntry.update.mockResolvedValue(d1);
    prismaModule.prisma.term.findFirst.mockResolvedValue(null); // no current term

    const result = await svc.updateGradeEntry('d1', { minScore: 90, maxScore: 100 });

    expect(result.data).toMatchObject({ gradeLabel: 'D1', minScore: 90, maxScore: 100 });
    expect(result.warning).toBeUndefined();
  });

  test('returns a warning when the current term has scores entered', async () => {
    const d1 = ALL_GRADE_ENTRIES.find(e => e.id === 'd1');

    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(d1);
    prismaModule.prisma.gradingScaleEntry.findMany.mockResolvedValue(siblingsExcluding('d1'));
    prismaModule.prisma.gradingScaleEntry.update.mockResolvedValue(d1);
    prismaModule.prisma.term.findFirst.mockResolvedValue({ id: 'term-uuid', isCurrent: true });
    prismaModule.prisma.pupilScore.count.mockResolvedValue(42);

    const result = await svc.updateGradeEntry('d1', { minScore: 90, maxScore: 100 });

    expect(result.warning).toMatch(/42 score/);
  });

  // ── gap validation ────────────────────────────────────────

  test('throws 422 when update creates a gap in grade bands', async () => {
    // Change D1 from (90-100) to (91-100) — leaves a gap at score 90
    // Sorted: D2 ends at 89, D1 starts at 91 → 89+1=90 ≠ 91 → GAP
    const d1 = ALL_GRADE_ENTRIES.find(e => e.id === 'd1');

    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(d1);
    prismaModule.prisma.gradingScaleEntry.findMany.mockResolvedValue(siblingsExcluding('d1'));

    await expect(
      svc.updateGradeEntry('d1', { minScore: 91, maxScore: 100 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('contiguous') });

    expect(prismaModule.prisma.gradingScaleEntry.update).not.toHaveBeenCalled();
  });

  // ── overlap validation ────────────────────────────────────

  test('throws 422 when update creates an overlap in grade bands', async () => {
    // Change D2 from (80-89) to (78-89) — overlaps with C3 which ends at 79
    // Sorted: C3(75-79) then D2(78-89) → 79+1=80 ≠ 78 → OVERLAP
    const d2 = ALL_GRADE_ENTRIES.find(e => e.id === 'd2');

    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(d2);
    prismaModule.prisma.gradingScaleEntry.findMany.mockResolvedValue(siblingsExcluding('d2'));

    await expect(
      svc.updateGradeEntry('d2', { minScore: 78, maxScore: 89 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('contiguous') });

    expect(prismaModule.prisma.gradingScaleEntry.update).not.toHaveBeenCalled();
  });

  test('throws 422 when minScore >= maxScore', async () => {
    const d1 = ALL_GRADE_ENTRIES.find(e => e.id === 'd1');
    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(d1);

    await expect(
      svc.updateGradeEntry('d1', { minScore: 95, maxScore: 90 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('minScore') });
  });

  test('throws 422 when update breaks full coverage of 0–100', async () => {
    // Change F9 from (0-29) to (1-29) — lower end no longer starts at 0
    const f9 = ALL_GRADE_ENTRIES.find(e => e.id === 'f9');

    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(f9);
    prismaModule.prisma.gradingScaleEntry.findMany.mockResolvedValue(siblingsExcluding('f9'));

    await expect(
      svc.updateGradeEntry('f9', { minScore: 1, maxScore: 29 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('0') });
  });

  test('throws 404 when entry not found', async () => {
    prismaModule.prisma.gradingScaleEntry.findUnique.mockResolvedValue(null);

    await expect(
      svc.updateGradeEntry('missing-uuid', { minScore: 90, maxScore: 100 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

// ── updateDivisionBoundary ────────────────────────────────────

describe('updateDivisionBoundary', () => {
  // ── happy path ────────────────────────────────────────────

  test('happy path — valid boundary update succeeds', async () => {
    // Expand Division I from (4-12) to (4-13) and shrink Division II from (13-23) to (14-23)
    // We test Div II update: change (13-23) to (14-23) — but this would leave a gap...
    // Instead test a valid change: keep all boundaries as-is (no actual range change)
    const div1 = ALL_DIVISION_BOUNDARIES.find(b => b.id === 'div1');

    prismaModule.prisma.divisionBoundary.findUnique.mockResolvedValue(div1);
    prismaModule.prisma.divisionBoundary.findMany.mockResolvedValue(divSiblingsExcluding('div1'));
    prismaModule.prisma.divisionBoundary.update.mockResolvedValue(div1);

    const result = await svc.updateDivisionBoundary('div1', { minAggregate: 4, maxAggregate: 12 });

    expect(result.data).toMatchObject({ divisionLabel: 'Division I' });
    expect(prismaModule.prisma.divisionBoundary.update).toHaveBeenCalled();
  });

  // ── gap validation ────────────────────────────────────────

  test('throws 422 when division boundary update creates a gap', async () => {
    // Change Division I from (4-12) to (4-11) — leaves a gap at 12
    // Division II starts at 13, so 11+1=12 ≠ 13 → GAP
    const div1 = ALL_DIVISION_BOUNDARIES.find(b => b.id === 'div1');

    prismaModule.prisma.divisionBoundary.findUnique.mockResolvedValue(div1);
    prismaModule.prisma.divisionBoundary.findMany.mockResolvedValue(divSiblingsExcluding('div1'));

    await expect(
      svc.updateDivisionBoundary('div1', { minAggregate: 4, maxAggregate: 11 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('contiguous') });

    expect(prismaModule.prisma.divisionBoundary.update).not.toHaveBeenCalled();
  });

  test('throws 422 when division boundary update creates an overlap', async () => {
    // Change Division I from (4-12) to (4-14) — overlaps Division II which starts at 13
    // Sorted: Div I(4-14), Div II(13-23) → 14+1=15 ≠ 13 → OVERLAP
    const div1 = ALL_DIVISION_BOUNDARIES.find(b => b.id === 'div1');

    prismaModule.prisma.divisionBoundary.findUnique.mockResolvedValue(div1);
    prismaModule.prisma.divisionBoundary.findMany.mockResolvedValue(divSiblingsExcluding('div1'));

    await expect(
      svc.updateDivisionBoundary('div1', { minAggregate: 4, maxAggregate: 14 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('contiguous') });
  });

  test('throws 422 when minAggregate >= maxAggregate', async () => {
    const div1 = ALL_DIVISION_BOUNDARIES.find(b => b.id === 'div1');
    prismaModule.prisma.divisionBoundary.findUnique.mockResolvedValue(div1);

    await expect(
      svc.updateDivisionBoundary('div1', { minAggregate: 12, maxAggregate: 4 }),
    ).rejects.toMatchObject({ status: 422 });
  });

  test('throws 422 when update breaks 4–36 coverage', async () => {
    // Change Ungraded from (35-36) to (35-35) — but 35 < 35 fails min < max check first
    // Instead: change Division I from (4-12) to (5-12) — lower end no longer starts at 4
    const div1 = ALL_DIVISION_BOUNDARIES.find(b => b.id === 'div1');

    prismaModule.prisma.divisionBoundary.findUnique.mockResolvedValue(div1);
    prismaModule.prisma.divisionBoundary.findMany.mockResolvedValue(divSiblingsExcluding('div1'));

    await expect(
      svc.updateDivisionBoundary('div1', { minAggregate: 5, maxAggregate: 12 }),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('4') });
  });

  test('throws 404 when boundary not found', async () => {
    prismaModule.prisma.divisionBoundary.findUnique.mockResolvedValue(null);

    await expect(
      svc.updateDivisionBoundary('missing-uuid', { minAggregate: 4, maxAggregate: 12 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
