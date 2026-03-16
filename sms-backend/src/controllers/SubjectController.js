/**
 * SubjectController — HTTP layer for subject and class-subject assignment endpoints.
 *
 * All routes: system_admin or dos (enforced in routers).
 * Delegates all business logic to SubjectService.
 */

import { validationResult } from 'express-validator';
import * as SubjectService   from '../services/SubjectService.js';

// ── Subject handlers ──────────────────────────────────────────

/**
 * GET /api/v1/admin/subjects
 * Query: includeInactive=true
 */
export async function listSubjects(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const data = await SubjectService.listSubjects({ includeInactive });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/subjects
 * Body: { name, code }
 */
export async function createSubject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, code } = req.body;
    const data = await SubjectService.createSubject({ name, code });
    return res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/subjects/:id
 * Body: { name?, code?, isActive? }
 */
export async function updateSubject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id }               = req.params;
    const { name, code, isActive } = req.body;
    const data = await SubjectService.updateSubject(id, { name, code, isActive });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/subjects/:id
 */
export async function deleteSubject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    await SubjectService.deleteSubject(req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ── Assignment handlers ───────────────────────────────────────

/**
 * GET /api/v1/admin/class-subject-assignments?classId=X&termId=Y
 */
export async function listAssignments(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { classId, termId } = req.query;
    const data = await SubjectService.listAssignments({ classId, termId });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/class-subject-assignments
 * Body: { classId, subjectId, termId, displayOrder?, maxScore? }
 */
export async function createAssignment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { classId, subjectId, termId, displayOrder, maxScore } = req.body;
    const data = await SubjectService.createAssignment(
      { classId, subjectId, termId, displayOrder, maxScore },
      req.user.id,
    );
    return res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/class-subject-assignments/:id
 * Body: { displayOrder?, maxScore? }
 */
export async function updateAssignment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id }                   = req.params;
    const { displayOrder, maxScore } = req.body;
    const data = await SubjectService.updateAssignment(id, { displayOrder, maxScore });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/class-subject-assignments/:id
 */
export async function deleteAssignment(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    await SubjectService.deleteAssignment(req.params.id);
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/class-subject-assignments/bulk
 * Body: { classId, termId, subjects: [{ subjectId, displayOrder?, maxScore? }] }
 */
export async function bulkAssignSubjects(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { classId, termId, subjects } = req.body;
    const data = await SubjectService.bulkAssignSubjects(
      { classId, termId, subjects },
      req.user.id,
    );
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
