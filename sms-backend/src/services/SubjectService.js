/**
 * SubjectService — subject CRUD and class-subject assignment management.
 *
 * Responsibilities:
 *   listSubjects()        — list subjects, active only by default
 *   createSubject()       — create a new system-wide subject
 *   updateSubject()       — rename, re-code, or toggle active
 *   deleteSubject()       — hard-delete; blocked if score entries exist
 *   listAssignments()     — subjects assigned to a class for a term
 *   createAssignment()    — assign a subject to a class for a term
 *   updateAssignment()    — change displayOrder or maxScore
 *   deleteAssignment()    — remove assignment; blocked if scores exist
 *   bulkAssignSubjects()  — replace all assignments for a class+term atomically
 */

import { prisma } from '../lib/prisma.js';

// ── Subject methods ───────────────────────────────────────────

/**
 * Return all subjects, active only by default.
 *
 * @param {{ includeInactive?: boolean }}
 * @returns {Promise<Subject[]>}
 */
export async function listSubjects({ includeInactive = false } = {}) {
  return prisma.subject.findMany({
    where:   includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Fetch a single subject by ID.
 *
 * @param {string} id
 * @returns {Promise<Subject>}
 * @throws {{ status: 404 }} if not found
 */
export async function getSubjectById(id) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) {
    throw Object.assign(new Error('Subject not found'), { status: 404 });
  }
  return subject;
}

/**
 * Create a new subject. name and code must each be unique.
 *
 * @param {{ name: string, code: string }}
 * @returns {Promise<Subject>}
 * @throws {{ status: 409 }} if name or code already in use
 */
export async function createSubject({ name, code }) {
  const nameConflict = await prisma.subject.findUnique({ where: { name } });
  if (nameConflict) {
    throw Object.assign(new Error(`A subject named '${name}' already exists`), { status: 409 });
  }

  const codeConflict = await prisma.subject.findUnique({ where: { code } });
  if (codeConflict) {
    throw Object.assign(new Error(`Subject code '${code}' is already in use`), { status: 409 });
  }

  return prisma.subject.create({ data: { name, code, isActive: true } });
}

/**
 * Update a subject's name, code, or active status.
 * Checks uniqueness only when name or code is actually changing.
 *
 * @param {string} id
 * @param {{ name?: string, code?: string, isActive?: boolean }}
 * @returns {Promise<Subject>}
 * @throws {{ status: 404 }} if not found
 * @throws {{ status: 409 }} if new name or code conflicts
 */
export async function updateSubject(id, { name, code, isActive }) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) {
    throw Object.assign(new Error('Subject not found'), { status: 404 });
  }

  if (name !== undefined && name !== subject.name) {
    const conflict = await prisma.subject.findUnique({ where: { name } });
    if (conflict) {
      throw Object.assign(new Error(`A subject named '${name}' already exists`), { status: 409 });
    }
  }

  if (code !== undefined && code !== subject.code) {
    const conflict = await prisma.subject.findUnique({ where: { code } });
    if (conflict) {
      throw Object.assign(new Error(`Subject code '${code}' is already in use`), { status: 409 });
    }
  }

  return prisma.subject.update({
    where: { id },
    data: {
      ...(name     !== undefined && { name }),
      ...(code     !== undefined && { code }),
      ...(isActive !== undefined && { isActive }),
    },
  });
}

/**
 * Hard-delete a subject. Blocked if any pupil scores reference it.
 * Use updateSubject({ isActive: false }) to deactivate instead.
 *
 * @param {string} id
 * @throws {{ status: 404 }} if not found
 * @throws {{ status: 409 }} if score entries exist
 */
export async function deleteSubject(id) {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) {
    throw Object.assign(new Error('Subject not found'), { status: 404 });
  }

  const scoreCount = await prisma.pupilScore.count({ where: { subjectId: id } });
  if (scoreCount > 0) {
    throw Object.assign(
      new Error('Cannot delete subject — score entries exist. Deactivate it instead.'),
      { status: 409 },
    );
  }

  await prisma.subject.delete({ where: { id } });
}

// ── Class-subject assignment methods ─────────────────────────

/**
 * List all subject assignments for a given class and term.
 * Results include subject details and the subject's section rules.
 *
 * @param {{ classId: string, termId: string }}
 * @returns {Promise<ClassSubjectAssignment[]>}
 * @throws {{ status: 400 }} if classId or termId is missing
 */
export async function listAssignments({ classId, termId }) {
  if (!classId || !termId) {
    throw Object.assign(new Error('classId and termId are required'), { status: 400 });
  }

  return prisma.classSubjectAssignment.findMany({
    where:   { classId, termId },
    include: {
      subject: {
        include: {
          subjectSectionRules: {
            include: { schoolSection: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { displayOrder: 'asc' },
  });
}

/**
 * Assign a subject to a class for a term.
 * Validates that class, subject, and term all exist and are active.
 *
 * @param {{ classId: string, subjectId: string, termId: string, displayOrder?: number, maxScore?: number }}
 * @param {string|null} createdById
 * @returns {Promise<ClassSubjectAssignment>}
 * @throws {{ status: 404 }} if class, subject, or term not found / inactive
 * @throws {{ status: 409 }} if assignment already exists
 */
export async function createAssignment(
  { classId, subjectId, termId, displayOrder = 1, maxScore = 100 },
  createdById = null,
) {
  const cls = await prisma.class.findFirst({ where: { id: classId, isActive: true } });
  if (!cls) {
    throw Object.assign(new Error('Class not found or not active'), { status: 404 });
  }

  const subject = await prisma.subject.findFirst({ where: { id: subjectId, isActive: true } });
  if (!subject) {
    throw Object.assign(new Error('Subject not found or not active'), { status: 404 });
  }

  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) {
    throw Object.assign(new Error('Term not found'), { status: 404 });
  }

  const existing = await prisma.classSubjectAssignment.findUnique({
    where: { classId_subjectId_termId: { classId, subjectId, termId } },
  });
  if (existing) {
    throw Object.assign(
      new Error('This subject is already assigned to this class for the selected term'),
      { status: 409 },
    );
  }

  return prisma.classSubjectAssignment.create({
    data: { classId, subjectId, termId, displayOrder, maxScore, createdById },
    include: { subject: true },
  });
}

/**
 * Update an assignment's displayOrder or maxScore.
 *
 * @param {string} id
 * @param {{ displayOrder?: number, maxScore?: number }}
 * @returns {Promise<ClassSubjectAssignment>}
 * @throws {{ status: 404 }} if assignment not found
 */
export async function updateAssignment(id, { displayOrder, maxScore }) {
  const assignment = await prisma.classSubjectAssignment.findUnique({ where: { id } });
  if (!assignment) {
    throw Object.assign(new Error('Assignment not found'), { status: 404 });
  }

  return prisma.classSubjectAssignment.update({
    where: { id },
    data: {
      ...(displayOrder !== undefined && { displayOrder }),
      ...(maxScore     !== undefined && { maxScore }),
    },
    include: { subject: true },
  });
}

/**
 * Remove an assignment. Blocked if any pupil scores exist for this
 * subject in the same term.
 *
 * @param {string} id
 * @throws {{ status: 404 }} if assignment not found
 * @throws {{ status: 409 }} if scores exist
 */
export async function deleteAssignment(id) {
  const assignment = await prisma.classSubjectAssignment.findUnique({ where: { id } });
  if (!assignment) {
    throw Object.assign(new Error('Assignment not found'), { status: 404 });
  }

  const scoreCount = await prisma.pupilScore.count({
    where: {
      subjectId:        assignment.subjectId,
      assessmentPeriod: { termId: assignment.termId },
    },
  });
  if (scoreCount > 0) {
    throw Object.assign(
      new Error('Cannot remove subject — scores already entered'),
      { status: 409 },
    );
  }

  await prisma.classSubjectAssignment.delete({ where: { id } });
}

/**
 * Replace ALL subject assignments for a class+term in a single transaction.
 * Blocked if any scores exist for the current assignments.
 *
 * @param {{ classId: string, termId: string, subjects: Array<{ subjectId: string, displayOrder?: number, maxScore?: number }> }}
 * @param {string|null} createdById
 * @returns {Promise<ClassSubjectAssignment[]>} the newly created assignments
 * @throws {{ status: 404 }} if class, term, or any subject not found / inactive
 * @throws {{ status: 409 }} if scores already exist for current assignments
 */
export async function bulkAssignSubjects({ classId, termId, subjects }, createdById = null) {
  const cls = await prisma.class.findFirst({ where: { id: classId, isActive: true } });
  if (!cls) {
    throw Object.assign(new Error('Class not found or not active'), { status: 404 });
  }

  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) {
    throw Object.assign(new Error('Term not found'), { status: 404 });
  }

  // Validate every subject in the incoming list
  for (const s of subjects) {
    const subject = await prisma.subject.findFirst({ where: { id: s.subjectId, isActive: true } });
    if (!subject) {
      throw Object.assign(
        new Error(`Subject '${s.subjectId}' not found or not active`),
        { status: 404 },
      );
    }
  }

  // Guard: block if any existing assignment already has scores
  const existingAssignments = await prisma.classSubjectAssignment.findMany({
    where:  { classId, termId },
    select: { subjectId: true },
  });

  if (existingAssignments.length > 0) {
    const existingSubjectIds = existingAssignments.map(a => a.subjectId);
    const scoreCount = await prisma.pupilScore.count({
      where: {
        subjectId:        { in: existingSubjectIds },
        assessmentPeriod: { termId },
      },
    });
    if (scoreCount > 0) {
      throw Object.assign(
        new Error('Cannot replace assignments — scores have already been entered for this class and term'),
        { status: 409 },
      );
    }
  }

  // Delete existing + create new — atomically
  const results = await prisma.$transaction([
    prisma.classSubjectAssignment.deleteMany({ where: { classId, termId } }),
    ...subjects.map(s =>
      prisma.classSubjectAssignment.create({
        data: {
          classId,
          termId,
          subjectId:    s.subjectId,
          displayOrder: s.displayOrder ?? 1,
          maxScore:     s.maxScore     ?? 100,
          createdById,
        },
      }),
    ),
  ]);

  // results[0] is deleteMany; the rest are the new assignments
  return results.slice(1);
}
