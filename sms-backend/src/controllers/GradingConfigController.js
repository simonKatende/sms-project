/**
 * GradingConfigController — HTTP layer for:
 *   /api/v1/admin/subject-section-rules
 *   /api/v1/admin/grading-scale
 *
 * Access: system_admin + dos for section rules; system_admin only for grading scale.
 * Delegates all business logic to GradingConfigService.
 */

import { validationResult } from 'express-validator';
import * as GradingConfigService from '../services/GradingConfigService.js';

// ── Subject-section rule handlers ─────────────────────────────

/**
 * GET /api/v1/admin/subject-section-rules?schoolSectionId=X
 */
export async function listSectionRules(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const data = await GradingConfigService.listSectionRules({
      schoolSectionId: req.query.schoolSectionId,
    });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/subject-section-rules
 * Body: { schoolSectionId, subjectId, includeInAggregate, isPenaltyTrigger }
 * Upserts the rule — creates or updates if already exists.
 */
export async function upsertSectionRule(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { schoolSectionId, subjectId, includeInAggregate, isPenaltyTrigger } = req.body;
    const data = await GradingConfigService.upsertSectionRule({
      schoolSectionId,
      subjectId,
      includeInAggregate,
      isPenaltyTrigger,
    });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/subject-section-rules/:id
 * Body: { includeInAggregate?, isPenaltyTrigger? }
 */
export async function updateSectionRule(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id }                              = req.params;
    const { includeInAggregate, isPenaltyTrigger } = req.body;
    const data = await GradingConfigService.updateSectionRuleById(id, {
      includeInAggregate,
      isPenaltyTrigger,
    });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

// ── Grading scale handlers ────────────────────────────────────

/**
 * GET /api/v1/admin/grading-scale/active
 */
export async function getActiveGradingScale(req, res, next) {
  try {
    const data = await GradingConfigService.getActiveGradingScale();
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/grading-scale/entries/:id
 * Body: { minScore, maxScore }
 * Returns: { data: updatedEntry, warning?: string }
 */
export async function updateGradeEntry(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id }               = req.params;
    const { minScore, maxScore } = req.body;
    const result = await GradingConfigService.updateGradeEntry(id, { minScore, maxScore });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/grading-scale/divisions/:id
 * Body: { minAggregate, maxAggregate }
 */
export async function updateDivisionBoundary(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id }                       = req.params;
    const { minAggregate, maxAggregate } = req.body;
    const result = await GradingConfigService.updateDivisionBoundary(id, {
      minAggregate,
      maxAggregate,
    });
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
