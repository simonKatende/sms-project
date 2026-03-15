/**
 * Academic calendar routes.
 *
 * academicYearAdminRouter → /api/v1/admin/academic-years
 * termAdminRouter         → /api/v1/admin/terms
 *
 * All routes: system_admin only.
 */

import { Router }          from 'express';
import { body, param }     from 'express-validator';
import { authenticate }    from '../middleware/auth.js';
import { requireRole }     from '../middleware/rbac.js';
import * as CalendarCtrl   from '../controllers/AcademicCalendarController.js';

// ── Shared validators ──────────────────────────────────────────

const isoDate = (field, opts = {}) =>
  body(field, `${field} must be a valid ISO date`)
    [opts.optional ? 'optional' : 'notEmpty']()
    .isISO8601()
    .toDate();

// ── Academic years router ──────────────────────────────────────

export const academicYearAdminRouter = Router();
academicYearAdminRouter.use(authenticate);
academicYearAdminRouter.use(requireRole('system_admin'));

const yearCreateValidation = [
  body('yearLabel')
    .trim()
    .notEmpty().withMessage('yearLabel is required')
    .isLength({ max: 20 }).withMessage('yearLabel max 20 chars'),
  isoDate('startDate'),
  isoDate('endDate'),
  body('isCurrent')
    .optional()
    .isBoolean().withMessage('isCurrent must be a boolean')
    .toBoolean(),
];

const yearUpdateValidation = [
  param('id').isUUID().withMessage('Invalid academic year ID'),
  body('yearLabel')
    .optional().trim()
    .isLength({ min: 1, max: 20 }).withMessage('yearLabel max 20 chars'),
  isoDate('startDate', { optional: true }),
  isoDate('endDate',   { optional: true }),
  body('isCurrent')
    .optional()
    .isBoolean().withMessage('isCurrent must be a boolean')
    .toBoolean(),
];

// GET /api/v1/admin/academic-years
academicYearAdminRouter.get('/',    CalendarCtrl.listAcademicYears);
// POST /api/v1/admin/academic-years
academicYearAdminRouter.post('/',   yearCreateValidation,  CalendarCtrl.createAcademicYear);
// PUT /api/v1/admin/academic-years/:id
academicYearAdminRouter.put('/:id', yearUpdateValidation,  CalendarCtrl.updateAcademicYear);

// ── Terms router ───────────────────────────────────────────────

export const termAdminRouter = Router();
termAdminRouter.use(authenticate);
termAdminRouter.use(requireRole('system_admin'));

const termCreateValidation = [
  body('academicYearId')
    .notEmpty().isUUID().withMessage('academicYearId must be a valid UUID'),
  body('termNumber')
    .notEmpty().withMessage('termNumber is required')
    .isInt().withMessage('termNumber must be an integer')
    .isIn([1, 2, 3]).withMessage('termNumber must be 1, 2, or 3')
    .toInt(),
  body('termLabel')
    .trim()
    .notEmpty().withMessage('termLabel is required')
    .isLength({ max: 40 }).withMessage('termLabel max 40 chars'),
  isoDate('startDate'),
  isoDate('endDate'),
  isoDate('nextTermStartDay',      { optional: true }),
  isoDate('nextTermStartBoarding', { optional: true }),
  isoDate('feesDueDate',           { optional: true }),
  body('isCurrent')
    .optional()
    .isBoolean().withMessage('isCurrent must be a boolean')
    .toBoolean(),
];

const termUpdateValidation = [
  param('id').isUUID().withMessage('Invalid term ID'),
  body('termNumber')
    .optional()
    .isInt().withMessage('termNumber must be an integer')
    .isIn([1, 2, 3]).withMessage('termNumber must be 1, 2, or 3')
    .toInt(),
  body('termLabel')
    .optional().trim()
    .isLength({ min: 1, max: 40 }).withMessage('termLabel max 40 chars'),
  isoDate('startDate',             { optional: true }),
  isoDate('endDate',               { optional: true }),
  isoDate('nextTermStartDay',      { optional: true }),
  isoDate('nextTermStartBoarding', { optional: true }),
  isoDate('feesDueDate',           { optional: true }),
  body('isCurrent')
    .optional()
    .isBoolean().withMessage('isCurrent must be a boolean')
    .toBoolean(),
];

// GET /api/v1/admin/terms?academicYearId=X
termAdminRouter.get('/',    CalendarCtrl.listTerms);
// POST /api/v1/admin/terms
termAdminRouter.post('/',   termCreateValidation,  CalendarCtrl.createTerm);
// PUT /api/v1/admin/terms/:id
termAdminRouter.put('/:id', termUpdateValidation,  CalendarCtrl.updateTerm);
// DELETE /api/v1/admin/terms/:id
termAdminRouter.delete('/:id', param('id').isUUID().withMessage('Invalid term ID'), CalendarCtrl.deleteTerm);
