/**
 * Grading config routes — two routers exported from this file:
 *
 *   subjectSectionRulesRouter  → /api/v1/admin/subject-section-rules
 *   gradingScaleRouter          → /api/v1/admin/grading-scale
 *
 * Section rules access: system_admin + dos
 * Grading scale access: system_admin only
 */

import { Router }       from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole }  from '../middleware/rbac.js';
import * as GradingCtrl from '../controllers/GradingConfigController.js';

// ── Subject-section rules router ──────────────────────────────

export const subjectSectionRulesRouter = Router();

subjectSectionRulesRouter.use(authenticate);
subjectSectionRulesRouter.use(requireRole('system_admin', 'dos'));

const sectionRuleBody = [
  body('schoolSectionId')
    .isUUID()
    .withMessage('schoolSectionId must be a valid UUID'),
  body('subjectId')
    .isUUID()
    .withMessage('subjectId must be a valid UUID'),
  body('includeInAggregate')
    .isBoolean()
    .withMessage('includeInAggregate must be a boolean'),
  body('isPenaltyTrigger')
    .isBoolean()
    .withMessage('isPenaltyTrigger must be a boolean'),
];

const updateRuleBody = [
  param('id').isUUID().withMessage('Invalid rule ID'),
  body('includeInAggregate')
    .optional()
    .isBoolean()
    .withMessage('includeInAggregate must be a boolean'),
  body('isPenaltyTrigger')
    .optional()
    .isBoolean()
    .withMessage('isPenaltyTrigger must be a boolean'),
];

// GET  /api/v1/admin/subject-section-rules?schoolSectionId=X
subjectSectionRulesRouter.get(
  '/',
  query('schoolSectionId').isUUID().withMessage('schoolSectionId must be a valid UUID'),
  GradingCtrl.listSectionRules,
);

// POST /api/v1/admin/subject-section-rules  (upsert)
subjectSectionRulesRouter.post('/', sectionRuleBody, GradingCtrl.upsertSectionRule);

// PUT  /api/v1/admin/subject-section-rules/:id
subjectSectionRulesRouter.put('/:id', updateRuleBody, GradingCtrl.updateSectionRule);

// ── Grading scale router ──────────────────────────────────────

export const gradingScaleRouter = Router();

gradingScaleRouter.use(authenticate);
gradingScaleRouter.use(requireRole('system_admin'));

const scoreRangeBody = [
  body('minScore')
    .isInt({ min: 0, max: 99 })
    .withMessage('minScore must be an integer between 0 and 99'),
  body('maxScore')
    .isInt({ min: 1, max: 100 })
    .withMessage('maxScore must be an integer between 1 and 100'),
];

const aggregateRangeBody = [
  body('minAggregate')
    .isInt({ min: 4, max: 35 })
    .withMessage('minAggregate must be an integer between 4 and 35'),
  body('maxAggregate')
    .isInt({ min: 5, max: 36 })
    .withMessage('maxAggregate must be an integer between 5 and 36'),
];

// GET /api/v1/admin/grading-scale/active
gradingScaleRouter.get('/active', GradingCtrl.getActiveGradingScale);

// PUT /api/v1/admin/grading-scale/entries/:id
gradingScaleRouter.put(
  '/entries/:id',
  [param('id').isUUID().withMessage('Invalid entry ID'), ...scoreRangeBody],
  GradingCtrl.updateGradeEntry,
);

// PUT /api/v1/admin/grading-scale/divisions/:id
gradingScaleRouter.put(
  '/divisions/:id',
  [param('id').isUUID().withMessage('Invalid division ID'), ...aggregateRangeBody],
  GradingCtrl.updateDivisionBoundary,
);
