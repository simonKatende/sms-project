/**
 * GradingConfigService — subject-section rules and grading scale configuration.
 *
 * Responsibilities:
 *   listSectionRules()         — all rules for a school section
 *   upsertSectionRule()        — create-or-update a subject-section rule
 *   updateSectionRuleById()    — update an existing rule by ID
 *   getActiveGradingScale()    — active scale with entries + division boundaries
 *   updateGradeEntry()         — change a grade band's score range (validates full set)
 *   updateDivisionBoundary()   — change a division's aggregate range (validates full set)
 */

import { prisma } from '../lib/prisma.js';

// ── Internal validators ───────────────────────────────────────

/**
 * Validate that a set of grade band entries:
 *   - each has minScore strictly less than maxScore
 *   - collectively cover exactly 0–100 with no gaps or overlaps
 *
 * Entries need not be sorted; this function sorts internally.
 *
 * @param {Array<{ gradeLabel: string, minScore: number, maxScore: number }>} entries
 * @throws {{ status: 422 }} on any validation failure
 */
function validateGradeBands(entries) {
  const sorted = [...entries].sort((a, b) => a.minScore - b.minScore);

  for (const e of sorted) {
    if (e.minScore >= e.maxScore) {
      throw Object.assign(
        new Error(`Grade band ${e.gradeLabel}: minScore (${e.minScore}) must be less than maxScore (${e.maxScore})`),
        { status: 422 },
      );
    }
  }

  if (sorted[0].minScore !== 0) {
    throw Object.assign(
      new Error(`Grade bands must cover from 0 — lowest band starts at ${sorted[0].minScore}`),
      { status: 422 },
    );
  }

  if (sorted[sorted.length - 1].maxScore !== 100) {
    throw Object.assign(
      new Error(`Grade bands must cover to 100 — highest band ends at ${sorted[sorted.length - 1].maxScore}`),
      { status: 422 },
    );
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur  = sorted[i];
    const next = sorted[i + 1];
    if (cur.maxScore + 1 !== next.minScore) {
      throw Object.assign(
        new Error(
          `Grade band ranges must be contiguous (no gaps or overlaps) — ` +
          `${cur.gradeLabel} ends at ${cur.maxScore}, next band starts at ${next.minScore}`,
        ),
        { status: 422 },
      );
    }
  }
}

/**
 * Validate that a set of division boundaries:
 *   - each has minAggregate strictly less than maxAggregate
 *   - collectively cover exactly 4–36 with no gaps or overlaps
 *
 * @param {Array<{ divisionLabel: string, minAggregate: number, maxAggregate: number }>} boundaries
 * @throws {{ status: 422 }} on any validation failure
 */
function validateDivisionBoundaries(boundaries) {
  const sorted = [...boundaries].sort((a, b) => a.minAggregate - b.minAggregate);

  for (const b of sorted) {
    if (b.minAggregate >= b.maxAggregate) {
      throw Object.assign(
        new Error(`Division ${b.divisionLabel}: minAggregate (${b.minAggregate}) must be less than maxAggregate (${b.maxAggregate})`),
        { status: 422 },
      );
    }
  }

  if (sorted[0].minAggregate !== 4) {
    throw Object.assign(
      new Error(`Division boundaries must start at 4 — lowest boundary starts at ${sorted[0].minAggregate}`),
      { status: 422 },
    );
  }

  if (sorted[sorted.length - 1].maxAggregate !== 36) {
    throw Object.assign(
      new Error(`Division boundaries must end at 36 — highest boundary ends at ${sorted[sorted.length - 1].maxAggregate}`),
      { status: 422 },
    );
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur  = sorted[i];
    const next = sorted[i + 1];
    if (cur.maxAggregate + 1 !== next.minAggregate) {
      throw Object.assign(
        new Error(
          `Division boundaries must be contiguous (no gaps or overlaps) — ` +
          `${cur.divisionLabel} ends at ${cur.maxAggregate}, next boundary starts at ${next.minAggregate}`,
        ),
        { status: 422 },
      );
    }
  }
}

/**
 * Return a warning string if the current term has any scores entered, else null.
 * Non-fatal — the grade band update still proceeds; the warning is included in the response.
 *
 * @returns {Promise<string|null>}
 */
async function checkActiveTermScoresWarning() {
  const currentTerm = await prisma.term.findFirst({ where: { isCurrent: true } });
  if (!currentTerm) return null;

  const scoreCount = await prisma.pupilScore.count({
    where: { assessmentPeriod: { termId: currentTerm.id } },
  });

  if (scoreCount > 0) {
    return `Active term has ${scoreCount} score(s) entered — grade boundary changes will affect how existing scores are displayed.`;
  }
  return null;
}

// ── Subject-section rule methods ──────────────────────────────

/**
 * Return all subject-section rules for a school section,
 * including subject name and code.
 *
 * @param {{ schoolSectionId: string }}
 * @returns {Promise<SubjectSectionRule[]>}
 * @throws {{ status: 400 }} if schoolSectionId is missing
 */
export async function listSectionRules({ schoolSectionId }) {
  if (!schoolSectionId) {
    throw Object.assign(new Error('schoolSectionId is required'), { status: 400 });
  }

  return prisma.subjectSectionRule.findMany({
    where:   { schoolSectionId },
    include: { subject: { select: { id: true, name: true, code: true, isActive: true } } },
    orderBy: { subject: { name: 'asc' } },
  });
}

/**
 * Create or update the rule for a (schoolSectionId, subjectId) pair.
 * Uses Prisma upsert on the @@unique([schoolSectionId, subjectId]) constraint.
 *
 * @param {{ schoolSectionId: string, subjectId: string, includeInAggregate: boolean, isPenaltyTrigger: boolean }}
 * @returns {Promise<SubjectSectionRule>}
 * @throws {{ status: 404 }} if section or subject not found
 */
export async function upsertSectionRule({ schoolSectionId, subjectId, includeInAggregate, isPenaltyTrigger }) {
  const section = await prisma.schoolSection.findUnique({ where: { id: schoolSectionId } });
  if (!section) {
    throw Object.assign(new Error('School section not found'), { status: 404 });
  }

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) {
    throw Object.assign(new Error('Subject not found'), { status: 404 });
  }

  return prisma.subjectSectionRule.upsert({
    where:   { schoolSectionId_subjectId: { schoolSectionId, subjectId } },
    update:  { includeInAggregate, isPenaltyTrigger },
    create:  { schoolSectionId, subjectId, includeInAggregate, isPenaltyTrigger },
    include: { subject: { select: { id: true, name: true, code: true } } },
  });
}

/**
 * Update an existing subject-section rule by its ID.
 *
 * @param {string} id
 * @param {{ includeInAggregate?: boolean, isPenaltyTrigger?: boolean }}
 * @returns {Promise<SubjectSectionRule>}
 * @throws {{ status: 404 }} if rule not found
 */
export async function updateSectionRuleById(id, { includeInAggregate, isPenaltyTrigger }) {
  const rule = await prisma.subjectSectionRule.findUnique({ where: { id } });
  if (!rule) {
    throw Object.assign(new Error('Subject-section rule not found'), { status: 404 });
  }

  return prisma.subjectSectionRule.update({
    where:   { id },
    data: {
      ...(includeInAggregate !== undefined && { includeInAggregate }),
      ...(isPenaltyTrigger   !== undefined && { isPenaltyTrigger }),
    },
    include: { subject: { select: { id: true, name: true, code: true } } },
  });
}

// ── Grading scale methods ─────────────────────────────────────

/**
 * Return the active grading scale with all grade band entries and division
 * boundaries, both ordered by displayOrder.
 *
 * @returns {Promise<GradingScale>}
 * @throws {{ status: 404 }} if no active scale exists
 */
export async function getActiveGradingScale() {
  const scale = await prisma.gradingScale.findFirst({
    where:   { isActive: true },
    include: {
      gradingScaleEntries: { orderBy: { displayOrder: 'asc' } },
      divisionBoundaries:  { orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!scale) {
    throw Object.assign(new Error('No active grading scale found'), { status: 404 });
  }

  return scale;
}

/**
 * Update a single grade band's score range.
 * Only minScore and maxScore may be changed (gradeLabel and pointsValue are immutable).
 *
 * Validates that the full set of bands for this scale remains contiguous and covers 0–100.
 * Returns a non-fatal warning if the active term already has scores entered.
 *
 * @param {string} id
 * @param {{ minScore: number, maxScore: number }}
 * @returns {Promise<{ data: GradingScaleEntry, warning?: string }>}
 * @throws {{ status: 404 }} if entry not found
 * @throws {{ status: 422 }} if score ranges create a gap, overlap, or miss full coverage
 */
export async function updateGradeEntry(id, { minScore, maxScore }) {
  const entry = await prisma.gradingScaleEntry.findUnique({ where: { id } });
  if (!entry) {
    throw Object.assign(new Error('Grade band entry not found'), { status: 404 });
  }

  // Quick local check before building full set
  if (minScore >= maxScore) {
    throw Object.assign(
      new Error('minScore must be less than maxScore'),
      { status: 422 },
    );
  }

  // Fetch all sibling entries (same scale, excluding this one)
  const siblings = await prisma.gradingScaleEntry.findMany({
    where: { gradingScaleId: entry.gradingScaleId, NOT: { id } },
  });

  // Validate the full hypothetical set
  validateGradeBands([...siblings, { ...entry, minScore, maxScore }]);

  const updated = await prisma.gradingScaleEntry.update({
    where: { id },
    data:  { minScore, maxScore },
  });

  const warning = await checkActiveTermScoresWarning();

  return { data: updated, ...(warning && { warning }) };
}

/**
 * Update a division boundary's aggregate range.
 * Only minAggregate and maxAggregate may be changed.
 *
 * Validates that the full set of boundaries for this scale remains contiguous
 * and covers 4–36.
 *
 * @param {string} id
 * @param {{ minAggregate: number, maxAggregate: number }}
 * @returns {Promise<{ data: DivisionBoundary }>}
 * @throws {{ status: 404 }} if boundary not found
 * @throws {{ status: 422 }} if aggregate ranges create a gap, overlap, or miss 4–36 coverage
 */
export async function updateDivisionBoundary(id, { minAggregate, maxAggregate }) {
  const boundary = await prisma.divisionBoundary.findUnique({ where: { id } });
  if (!boundary) {
    throw Object.assign(new Error('Division boundary not found'), { status: 404 });
  }

  if (minAggregate >= maxAggregate) {
    throw Object.assign(
      new Error('minAggregate must be less than maxAggregate'),
      { status: 422 },
    );
  }

  const siblings = await prisma.divisionBoundary.findMany({
    where: { gradingScaleId: boundary.gradingScaleId, NOT: { id } },
  });

  validateDivisionBoundaries([...siblings, { ...boundary, minAggregate, maxAggregate }]);

  const updated = await prisma.divisionBoundary.update({
    where: { id },
    data:  { minAggregate, maxAggregate },
  });

  return { data: updated };
}
