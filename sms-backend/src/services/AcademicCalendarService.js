/**
 * AcademicCalendarService — business logic for academic years and terms.
 *
 * Business rules:
 *  - Only ONE academic year may have isCurrent=true at a time.
 *    Setting a new year current clears all others inside a transaction.
 *  - yearLabel must be unique.
 *  - endDate must be strictly after startDate.
 *  - termNumber (1|2|3) must be unique per academic year.
 *  - Only ONE term per academic year may have isCurrent=true at a time.
 */

import { prisma } from '../lib/prisma.js';
import * as Repo  from '../repositories/AcademicCalendarRepository.js';

// ── Academic years ─────────────────────────────────────────────

/**
 * List all academic years ordered newest first.
 * @returns {Promise<Array>}
 */
export async function listAcademicYears() {
  return Repo.findAllAcademicYears();
}

/**
 * Create a new academic year.
 * If isCurrent=true, wraps the clear + create in a transaction.
 *
 * @param {object} fields
 * @param {string}  fields.yearLabel — e.g. '2026', unique
 * @param {string}  fields.startDate — ISO date string
 * @param {string}  fields.endDate   — ISO date string, must be after startDate
 * @param {boolean} [fields.isCurrent=false]
 * @returns {Promise<object>}
 */
export async function createAcademicYear({ yearLabel, startDate, endDate, isCurrent = false }) {
  if (new Date(endDate) <= new Date(startDate)) {
    throw Object.assign(new Error('endDate must be after startDate'), { status: 400 });
  }

  const conflict = await Repo.findAcademicYearByLabel(yearLabel);
  if (conflict) {
    throw Object.assign(
      new Error(`Academic year '${yearLabel}' already exists`),
      { status: 409 },
    );
  }

  const data = {
    yearLabel,
    startDate: new Date(startDate),
    endDate:   new Date(endDate),
    isCurrent: Boolean(isCurrent),
  };

  if (isCurrent) {
    return prisma.$transaction(async (tx) => {
      await Repo.clearCurrentAcademicYears(tx);
      return Repo.createAcademicYear(data, tx);
    });
  }

  return Repo.createAcademicYear(data);
}

/**
 * Update an existing academic year.
 * If isCurrent is being set to true, wraps the clear + update in a transaction.
 *
 * @param {string} id
 * @param {object} fields — all optional
 * @returns {Promise<object>}
 */
export async function updateAcademicYear(id, { yearLabel, startDate, endDate, isCurrent }) {
  const existing = await Repo.findAcademicYearById(id);
  if (!existing) {
    throw Object.assign(new Error('Academic year not found'), { status: 404 });
  }

  // Validate combined dates (use existing values as fallback)
  const effectiveStart = startDate ? new Date(startDate) : existing.startDate;
  const effectiveEnd   = endDate   ? new Date(endDate)   : existing.endDate;
  if (effectiveEnd <= effectiveStart) {
    throw Object.assign(new Error('endDate must be after startDate'), { status: 400 });
  }

  // Uniqueness check only when yearLabel is actually changing
  if (yearLabel !== undefined && yearLabel !== existing.yearLabel) {
    const conflict = await Repo.findAcademicYearByLabel(yearLabel);
    if (conflict) {
      throw Object.assign(
        new Error(`Academic year '${yearLabel}' already exists`),
        { status: 409 },
      );
    }
  }

  const data = {};
  if (yearLabel  !== undefined) data.yearLabel  = yearLabel;
  if (startDate  !== undefined) data.startDate  = new Date(startDate);
  if (endDate    !== undefined) data.endDate    = new Date(endDate);
  if (isCurrent  !== undefined) data.isCurrent  = Boolean(isCurrent);

  if (isCurrent) {
    return prisma.$transaction(async (tx) => {
      await Repo.clearCurrentAcademicYears(tx);
      return Repo.updateAcademicYear(id, data, tx);
    });
  }

  return Repo.updateAcademicYear(id, data);
}

// ── Terms ──────────────────────────────────────────────────────

/**
 * List all terms for a given academic year.
 * @param {string} academicYearId
 * @returns {Promise<Array>}
 */
export async function listTerms(academicYearId) {
  if (!academicYearId) {
    throw Object.assign(
      new Error('academicYearId query parameter is required'),
      { status: 400 },
    );
  }
  const year = await Repo.findAcademicYearById(academicYearId);
  if (!year) {
    throw Object.assign(new Error('Academic year not found'), { status: 404 });
  }
  return Repo.findTermsByYear(academicYearId);
}

/**
 * Create a term within an academic year.
 * If isCurrent=true, clears all other current terms in the same year first.
 *
 * @param {object} fields
 * @param {string}  fields.academicYearId
 * @param {number}  fields.termNumber        — 1, 2, or 3
 * @param {string}  fields.termLabel         — e.g. 'Term 1 2026'
 * @param {string}  fields.startDate
 * @param {string}  fields.endDate
 * @param {string}  [fields.nextTermStartDay]
 * @param {string}  [fields.nextTermStartBoarding]
 * @param {string}  [fields.feesDueDate]
 * @param {boolean} [fields.isCurrent=false]
 * @returns {Promise<object>}
 */
export async function createTerm({
  academicYearId,
  termNumber,
  termLabel,
  startDate,
  endDate,
  nextTermStartDay,
  nextTermStartBoarding,
  feesDueDate,
  isCurrent = false,
}) {
  const year = await Repo.findAcademicYearById(academicYearId);
  if (!year) {
    throw Object.assign(new Error('Academic year not found'), { status: 404 });
  }

  if (new Date(endDate) <= new Date(startDate)) {
    throw Object.assign(new Error('endDate must be after startDate'), { status: 400 });
  }

  const duplicate = await Repo.findTermByNumberInYear(academicYearId, termNumber);
  if (duplicate) {
    throw Object.assign(
      new Error(`Term ${termNumber} already exists for this academic year`),
      { status: 409 },
    );
  }

  const data = {
    academicYearId,
    termNumber,
    termLabel,
    startDate:             new Date(startDate),
    endDate:               new Date(endDate),
    nextTermStartDay:      nextTermStartDay      ? new Date(nextTermStartDay)      : null,
    nextTermStartBoarding: nextTermStartBoarding ? new Date(nextTermStartBoarding) : null,
    feesDueDate:           feesDueDate           ? new Date(feesDueDate)           : null,
    isCurrent:             Boolean(isCurrent),
  };

  if (isCurrent) {
    return prisma.$transaction(async (tx) => {
      await Repo.clearCurrentTermsInYear(academicYearId, tx);
      return Repo.createTerm(data, tx);
    });
  }

  return Repo.createTerm(data);
}

/**
 * Update an existing term.
 * If isCurrent is being set to true, clears other current terms in the same year.
 *
 * @param {string} id
 * @param {object} fields — all optional
 * @returns {Promise<object>}
 */
export async function updateTerm(id, {
  termNumber,
  termLabel,
  startDate,
  endDate,
  nextTermStartDay,
  nextTermStartBoarding,
  feesDueDate,
  isCurrent,
}) {
  const existing = await Repo.findTermById(id);
  if (!existing) {
    throw Object.assign(new Error('Term not found'), { status: 404 });
  }

  const effectiveStart = startDate ? new Date(startDate) : existing.startDate;
  const effectiveEnd   = endDate   ? new Date(endDate)   : existing.endDate;
  if (effectiveEnd <= effectiveStart) {
    throw Object.assign(new Error('endDate must be after startDate'), { status: 400 });
  }

  // termNumber uniqueness check only if it's actually changing
  if (termNumber !== undefined && termNumber !== existing.termNumber) {
    const conflict = await Repo.findTermByNumberInYear(existing.academicYearId, termNumber);
    if (conflict) {
      throw Object.assign(
        new Error(`Term ${termNumber} already exists for this academic year`),
        { status: 409 },
      );
    }
  }

  const data = {};
  if (termNumber            !== undefined) data.termNumber            = termNumber;
  if (termLabel             !== undefined) data.termLabel             = termLabel;
  if (startDate             !== undefined) data.startDate             = new Date(startDate);
  if (endDate               !== undefined) data.endDate               = new Date(endDate);
  if (nextTermStartDay      !== undefined) data.nextTermStartDay      = nextTermStartDay      ? new Date(nextTermStartDay)      : null;
  if (nextTermStartBoarding !== undefined) data.nextTermStartBoarding = nextTermStartBoarding ? new Date(nextTermStartBoarding) : null;
  if (feesDueDate           !== undefined) data.feesDueDate           = feesDueDate           ? new Date(feesDueDate)           : null;
  if (isCurrent             !== undefined) data.isCurrent             = Boolean(isCurrent);

  if (isCurrent) {
    return prisma.$transaction(async (tx) => {
      await Repo.clearCurrentTermsInYear(existing.academicYearId, tx);
      return Repo.updateTerm(id, data, tx);
    });
  }

  return Repo.updateTerm(id, data);
}

/**
 * Delete a term by id.
 * @param {string} id
 */
export async function deleteTerm(id) {
  const existing = await Repo.findTermById(id);
  if (!existing) {
    throw Object.assign(new Error('Term not found'), { status: 404 });
  }
  await Repo.deleteTerm(id);
}
