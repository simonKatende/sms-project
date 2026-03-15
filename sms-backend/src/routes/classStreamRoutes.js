/**
 * Class & Stream routes — /api/v1/classes, /api/v1/streams
 *
 * Read endpoints: all authenticated roles
 * Write endpoints: system_admin only
 */

import { Router } from 'express';
import { body }   from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole }  from '../middleware/rbac.js';
import * as CSController from '../controllers/ClassStreamController.js';

// ── Classes router ─────────────────────────────────────────────
export const classRouter = Router();
classRouter.use(authenticate);

const classCreateValidation = [
  body('schoolSectionId').notEmpty().isUUID().withMessage('schoolSectionId must be a valid UUID'),
  body('classSubGroupId').notEmpty().isUUID().withMessage('classSubGroupId must be a valid UUID'),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 40 }),
  body('levelOrder').isInt({ min: 0 }).withMessage('levelOrder must be a non-negative integer'),
];

const classUpdateValidation = [
  body('name').optional().trim().notEmpty().isLength({ max: 40 }),
  body('levelOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
];

classRouter.get('/',          CSController.listClasses);
classRouter.post('/',         requireRole('system_admin'), classCreateValidation, CSController.createClass);
classRouter.put('/:id',       requireRole('system_admin'), classUpdateValidation, CSController.updateClass);

// ── Streams router ─────────────────────────────────────────────
export const streamRouter = Router();
streamRouter.use(authenticate);

const streamCreateValidation = [
  body('classId').notEmpty().isUUID().withMessage('classId must be a valid UUID'),
  body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 60 }),
  body('academicYearId').optional().isUUID(),
  body('classTeacherId').optional().isUUID(),
];

const streamUpdateValidation = [
  body('name').optional().trim().notEmpty().isLength({ max: 60 }),
  body('classTeacherId').optional().isUUID(),
  body('isActive').optional().isBoolean(),
];

streamRouter.get('/',    CSController.listStreams);
streamRouter.post('/',   requireRole('system_admin'), streamCreateValidation, CSController.createStream);
streamRouter.put('/:id', requireRole('system_admin'), streamUpdateValidation, CSController.updateStream);

// ── School sections (read-only) ────────────────────────────────
export const schoolSectionRouter = Router();
schoolSectionRouter.use(authenticate);
schoolSectionRouter.get('/', CSController.listSchoolSections);

// ── Academic years (read-only) ─────────────────────────────────
export const academicYearRouter = Router();
academicYearRouter.use(authenticate);
academicYearRouter.get('/', CSController.listAcademicYears);
