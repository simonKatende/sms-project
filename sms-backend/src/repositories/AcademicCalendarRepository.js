/**
 * AcademicCalendarRepository — DB queries for academic years and terms.
 * Functions that participate in transactions accept an optional `tx` client.
 */

import { prisma } from '../lib/prisma.js';

// ── Shared includes ────────────────────────────────────────────

const YEAR_INCLUDE = {
  _count: { select: { terms: true } },
};

const YEAR_WITH_TERMS_INCLUDE = {
  terms:  { orderBy: { termNumber: 'asc' } },
  _count: { select: { terms: true } },
};

const TERM_INCLUDE = {
  academicYear: { select: { id: true, yearLabel: true, isCurrent: true } },
};

// ── Academic years ─────────────────────────────────────────────

/**
 * Return all academic years ordered newest first.
 * @returns {Promise<Array>}
 */
export async function findAllAcademicYears() {
  return prisma.academicYear.findMany({
    include: YEAR_INCLUDE,
    orderBy: { startDate: 'desc' },
  });
}

/**
 * Find an academic year by primary key (includes its terms).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findAcademicYearById(id) {
  return prisma.academicYear.findUnique({
    where:   { id },
    include: YEAR_WITH_TERMS_INCLUDE,
  });
}

/**
 * Find an academic year by its label (e.g. '2026').
 * @param {string} yearLabel
 * @returns {Promise<object|null>}
 */
export async function findAcademicYearByLabel(yearLabel) {
  return prisma.academicYear.findUnique({ where: { yearLabel } });
}

/**
 * Set isCurrent=false on every academic year.
 * Designed to run inside a Prisma transaction.
 * @param {object} [tx] — Prisma transaction client; falls back to shared client
 */
export async function clearCurrentAcademicYears(tx) {
  return (tx ?? prisma).academicYear.updateMany({
    where: { isCurrent: true },
    data:  { isCurrent: false },
  });
}

/**
 * Create an academic year.
 * @param {object} data
 * @param {object} [tx]
 * @returns {Promise<object>}
 */
export async function createAcademicYear(data, tx) {
  return (tx ?? prisma).academicYear.create({
    data,
    include: YEAR_INCLUDE,
  });
}

/**
 * Update an academic year by id.
 * @param {string} id
 * @param {object} data
 * @param {object} [tx]
 * @returns {Promise<object>}
 */
export async function updateAcademicYear(id, data, tx) {
  return (tx ?? prisma).academicYear.update({
    where:   { id },
    data,
    include: YEAR_INCLUDE,
  });
}

// ── Terms ──────────────────────────────────────────────────────

/**
 * Return all terms for a given academic year, ordered by termNumber.
 * @param {string} academicYearId
 * @returns {Promise<Array>}
 */
export async function findTermsByYear(academicYearId) {
  return prisma.term.findMany({
    where:   { academicYearId },
    include: TERM_INCLUDE,
    orderBy: { termNumber: 'asc' },
  });
}

/**
 * Find a term by primary key.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findTermById(id) {
  return prisma.term.findUnique({ where: { id }, include: TERM_INCLUDE });
}

/**
 * Find a term by its number within a given academic year.
 * Used to enforce uniqueness of termNumber per year.
 * @param {string} academicYearId
 * @param {number} termNumber
 * @returns {Promise<object|null>}
 */
export async function findTermByNumberInYear(academicYearId, termNumber) {
  return prisma.term.findFirst({ where: { academicYearId, termNumber } });
}

/**
 * Set isCurrent=false on every term within a given academic year.
 * Designed to run inside a Prisma transaction.
 * @param {string} academicYearId
 * @param {object} [tx]
 */
export async function clearCurrentTermsInYear(academicYearId, tx) {
  return (tx ?? prisma).term.updateMany({
    where: { academicYearId, isCurrent: true },
    data:  { isCurrent: false },
  });
}

/**
 * Create a term.
 * @param {object} data
 * @param {object} [tx]
 * @returns {Promise<object>}
 */
export async function createTerm(data, tx) {
  return (tx ?? prisma).term.create({
    data,
    include: TERM_INCLUDE,
  });
}

/**
 * Update a term by id.
 * @param {string} id
 * @param {object} data
 * @param {object} [tx]
 * @returns {Promise<object>}
 */
export async function updateTerm(id, data, tx) {
  return (tx ?? prisma).term.update({
    where:   { id },
    data,
    include: TERM_INCLUDE,
  });
}

/**
 * Hard-delete a term by id.
 * @param {string} id
 */
export async function deleteTerm(id) {
  return prisma.term.delete({ where: { id } });
}
