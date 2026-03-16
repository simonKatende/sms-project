/**
 * Subject routes — two routers exported from this file:
 *
 *   subjectRouter               → /api/v1/admin/subjects
 *   classSubjectAssignmentRouter → /api/v1/admin/class-subject-assignments
 *
 * Access: system_admin or dos
 */

import { Router }       from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole }  from '../middleware/rbac.js';
import * as SubjectCtrl from '../controllers/SubjectController.js';

const ALLOWED_ROLES = ['system_admin', 'dos'];

// ── Subject router ────────────────────────────────────────────

export const subjectRouter = Router();

subjectRouter.use(authenticate);
subjectRouter.use(requireRole(...ALLOWED_ROLES));

const createSubjectValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('name is required (max 120 chars)'),
  body('code')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('code is required (max 20 chars)'),
];

const updateSubjectValidation = [
  param('id').isUUID().withMessage('Invalid subject ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('name max 120 chars'),
  body('code')
    .optional()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('code max 20 chars'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// GET  /api/v1/admin/subjects
subjectRouter.get('/', SubjectCtrl.listSubjects);

// POST /api/v1/admin/subjects
subjectRouter.post('/', createSubjectValidation, SubjectCtrl.createSubject);

// PUT  /api/v1/admin/subjects/:id
subjectRouter.put('/:id', updateSubjectValidation, SubjectCtrl.updateSubject);

// DELETE /api/v1/admin/subjects/:id
subjectRouter.delete('/:id', param('id').isUUID().withMessage('Invalid subject ID'), SubjectCtrl.deleteSubject);

// ── Class-subject assignment router ───────────────────────────

export const classSubjectAssignmentRouter = Router();

classSubjectAssignmentRouter.use(authenticate);
classSubjectAssignmentRouter.use(requireRole(...ALLOWED_ROLES));

const listAssignmentValidation = [
  query('classId').isUUID().withMessage('classId must be a valid UUID'),
  query('termId').isUUID().withMessage('termId must be a valid UUID'),
];

const createAssignmentValidation = [
  body('classId').isUUID().withMessage('classId must be a valid UUID'),
  body('subjectId').isUUID().withMessage('subjectId must be a valid UUID'),
  body('termId').isUUID().withMessage('termId must be a valid UUID'),
  body('displayOrder')
    .optional()
    .isInt({ min: 1 })
    .withMessage('displayOrder must be a positive integer'),
  body('maxScore')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('maxScore must be between 1 and 999'),
];

const updateAssignmentValidation = [
  param('id').isUUID().withMessage('Invalid assignment ID'),
  body('displayOrder')
    .optional()
    .isInt({ min: 1 })
    .withMessage('displayOrder must be a positive integer'),
  body('maxScore')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('maxScore must be between 1 and 999'),
];

const bulkValidation = [
  body('classId').isUUID().withMessage('classId must be a valid UUID'),
  body('termId').isUUID().withMessage('termId must be a valid UUID'),
  body('subjects')
    .isArray({ min: 0 })
    .withMessage('subjects must be an array'),
  body('subjects.*.subjectId')
    .isUUID()
    .withMessage('Each subject must have a valid subjectId UUID'),
  body('subjects.*.displayOrder')
    .optional()
    .isInt({ min: 1 })
    .withMessage('displayOrder must be a positive integer'),
  body('subjects.*.maxScore')
    .optional()
    .isInt({ min: 1, max: 999 })
    .withMessage('maxScore must be between 1 and 999'),
];

const idParam = [param('id').isUUID().withMessage('Invalid assignment ID')];

// IMPORTANT: /bulk must be declared before /:id to avoid param capture
// POST /api/v1/admin/class-subject-assignments/bulk
classSubjectAssignmentRouter.post('/bulk', bulkValidation, SubjectCtrl.bulkAssignSubjects);

// GET  /api/v1/admin/class-subject-assignments?classId=X&termId=Y
classSubjectAssignmentRouter.get('/', listAssignmentValidation, SubjectCtrl.listAssignments);

// POST /api/v1/admin/class-subject-assignments
classSubjectAssignmentRouter.post('/', createAssignmentValidation, SubjectCtrl.createAssignment);

// PUT  /api/v1/admin/class-subject-assignments/:id
classSubjectAssignmentRouter.put('/:id', updateAssignmentValidation, SubjectCtrl.updateAssignment);

// DELETE /api/v1/admin/class-subject-assignments/:id
classSubjectAssignmentRouter.delete('/:id', idParam, SubjectCtrl.deleteAssignment);
