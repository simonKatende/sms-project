/**
 * ClassStreamRepository — DB queries for classes and streams.
 */

import { prisma } from '../lib/prisma.js';

// ── Shared includes ────────────────────────────────────────────

const CLASS_INCLUDE = {
  schoolSection: { select: { id: true, name: true, code: true, rankingMethod: true } },
  _count: { select: { streams: true } },
};

const STREAM_INCLUDE = {
  class:        { include: { schoolSection: { select: { id: true, name: true } } } },
  academicYear: { select: { id: true, yearLabel: true, isCurrent: true } },
  classTeacher: { select: { id: true, fullName: true } },
};

// ── Academic year helpers ──────────────────────────────────────

export async function getCurrentAcademicYear() {
  return prisma.academicYear.findFirst({ where: { isCurrent: true } });
}

export async function findAllAcademicYears() {
  return prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
}

// ── Classes ────────────────────────────────────────────────────

export async function findAllClasses({ includeInactive = false } = {}) {
  return prisma.class.findMany({
    where:   includeInactive ? {} : { isActive: true },
    include: CLASS_INCLUDE,
    orderBy: { levelOrder: 'asc' },
  });
}

export async function findClassById(id) {
  return prisma.class.findUnique({ where: { id }, include: CLASS_INCLUDE });
}

export async function createClass({ schoolSectionId, name, levelOrder }) {
  return prisma.class.create({
    data:    { schoolSectionId, name, levelOrder },
    include: CLASS_INCLUDE,
  });
}

export async function updateClass(id, { name, levelOrder, isActive }) {
  const data = {};
  if (name        !== undefined) data.name        = name;
  if (levelOrder  !== undefined) data.levelOrder  = levelOrder;
  if (isActive    !== undefined) data.isActive    = isActive;
  return prisma.class.update({ where: { id }, data, include: CLASS_INCLUDE });
}

// ── Streams ────────────────────────────────────────────────────

/**
 * List streams. Defaults to the current academic year.
 * @param {object} opts
 * @param {string} [opts.academicYearId] — override; defaults to current year
 * @param {string} [opts.classId]        — filter by class
 * @param {boolean} [opts.includeInactive]
 */
export async function findStreams({ academicYearId, classId, includeInactive = false } = {}) {
  let yearId = academicYearId;
  if (!yearId) {
    const current = await getCurrentAcademicYear();
    yearId = current?.id ?? null;
  }

  return prisma.stream.findMany({
    where: {
      ...(yearId ? { academicYearId: yearId } : {}),
      ...(classId ? { classId } : {}),
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: STREAM_INCLUDE,
    orderBy: [{ class: { levelOrder: 'asc' } }, { name: 'asc' }],
  });
}

export async function findStreamById(id) {
  return prisma.stream.findUnique({ where: { id }, include: STREAM_INCLUDE });
}

export async function createStream({ classId, name, academicYearId, classTeacherId }) {
  let yearId = academicYearId;
  if (!yearId) {
    const current = await getCurrentAcademicYear();
    if (!current) throw Object.assign(new Error('No current academic year set. Create one first.'), { status: 422 });
    yearId = current.id;
  }
  return prisma.stream.create({
    data:    { classId, name, academicYearId: yearId, classTeacherId: classTeacherId ?? null },
    include: STREAM_INCLUDE,
  });
}

export async function updateStream(id, { name, classTeacherId, isActive }) {
  const data = {};
  if (name           !== undefined) data.name           = name;
  if (classTeacherId !== undefined) data.classTeacherId = classTeacherId;
  if (isActive       !== undefined) data.isActive       = isActive;
  return prisma.stream.update({ where: { id }, data, include: STREAM_INCLUDE });
}

// ── School sections (read-only — seeded) ──────────────────────

export async function findAllSchoolSections() {
  return prisma.schoolSection.findMany({ orderBy: { name: 'asc' } });
}
