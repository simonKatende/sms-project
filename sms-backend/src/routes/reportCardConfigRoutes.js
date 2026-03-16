/**
 * Report card config routes — two routers exported:
 *
 *   assessmentTypeRouter     → /api/v1/admin/assessment-types
 *   reportCardSettingsRouter → /api/v1/admin/report-card-settings
 *
 * Access: system_admin only for all routes.
 */

import { Router }      from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole }  from '../middleware/rbac.js';
import * as RCCtrl     from '../controllers/ReportCardConfigController.js';

// ── Assessment Type router ─────────────────────────────────────

export const assessmentTypeRouter = Router();

assessmentTypeRouter.use(authenticate);
assessmentTypeRouter.use(requireRole('system_admin'));

const createTypeBody = [
  body('code')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 30 })
    .withMessage('code is required and must be at most 30 characters'),
  body('label')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('label is required and must be at most 80 characters'),
  body('appearsOnReportCard')
    .isBoolean()
    .withMessage('appearsOnReportCard must be a boolean'),
  body('displayOrder')
    .isInt({ min: 1 })
    .withMessage('displayOrder must be a positive integer'),
];

const updateTypeBody = [
  param('id').isUUID().withMessage('Invalid assessment type ID'),
  body('label')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 80 })
    .withMessage('label must be a non-empty string of at most 80 characters'),
  body('appearsOnReportCard')
    .optional()
    .isBoolean()
    .withMessage('appearsOnReportCard must be a boolean'),
  body('displayOrder')
    .optional()
    .isInt({ min: 1 })
    .withMessage('displayOrder must be a positive integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// GET  /api/v1/admin/assessment-types
assessmentTypeRouter.get('/', RCCtrl.listAssessmentTypes);

// POST /api/v1/admin/assessment-types
assessmentTypeRouter.post('/', createTypeBody, RCCtrl.createAssessmentType);

// PUT  /api/v1/admin/assessment-types/:id
assessmentTypeRouter.put('/:id', updateTypeBody, RCCtrl.updateAssessmentType);

// DELETE /api/v1/admin/assessment-types/:id  (deactivate)
assessmentTypeRouter.delete(
  '/:id',
  [param('id').isUUID().withMessage('Invalid assessment type ID')],
  RCCtrl.deactivateAssessmentType,
);

// ── Report Card Settings router ────────────────────────────────

export const reportCardSettingsRouter = Router();

reportCardSettingsRouter.use(authenticate);
reportCardSettingsRouter.use(requireRole('system_admin'));

const settingsBody = [
  body('showBot')
    .optional()
    .isBoolean()
    .withMessage('showBot must be a boolean'),
  body('showMot')
    .optional()
    .isBoolean()
    .withMessage('showMot must be a boolean'),
  body('showEot')
    .optional()
    .isBoolean()
    .withMessage('showEot must be a boolean'),
  body('averagePeriods')
    .optional()
    .isBoolean()
    .withMessage('averagePeriods must be a boolean'),
  body('showClassRank')
    .optional()
    .isBoolean()
    .withMessage('showClassRank must be a boolean'),
  body('rankingFormat')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('rankingFormat must be a non-empty string'),
  body('showGradeGuide')
    .optional()
    .isBoolean()
    .withMessage('showGradeGuide must be a boolean'),
  body('showSchoolRequirements')
    .optional()
    .isBoolean()
    .withMessage('showSchoolRequirements must be a boolean'),
  body('showNextTermDates')
    .optional()
    .isBoolean()
    .withMessage('showNextTermDates must be a boolean'),
  body('whoCanGenerate')
    .optional()
    .isIn(['dos_only', 'dos_and_admin'])
    .withMessage('whoCanGenerate must be dos_only or dos_and_admin'),
];

// GET /api/v1/admin/report-card-settings
reportCardSettingsRouter.get('/', RCCtrl.getReportCardSettings);

// PUT /api/v1/admin/report-card-settings
reportCardSettingsRouter.put('/', settingsBody, RCCtrl.upsertReportCardSettings);
