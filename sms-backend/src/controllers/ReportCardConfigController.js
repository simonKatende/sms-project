/**
 * ReportCardConfigController — HTTP layer for:
 *   /api/v1/admin/assessment-types
 *   /api/v1/admin/report-card-settings
 *
 * Access: system_admin only.
 * Delegates all business logic to ReportCardConfigService.
 */

import { validationResult } from 'express-validator';
import * as ReportCardConfigService from '../services/ReportCardConfigService.js';

// ── Assessment Type handlers ───────────────────────────────────

/**
 * GET /api/v1/admin/assessment-types
 */
export async function listAssessmentTypes(req, res, next) {
  try {
    const data = await ReportCardConfigService.listAssessmentTypes();
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/assessment-types
 * Body: { code, label, appearsOnReportCard, displayOrder }
 */
export async function createAssessmentType(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { code, label, appearsOnReportCard, displayOrder } = req.body;
    const data = await ReportCardConfigService.createAssessmentType({
      code,
      label,
      appearsOnReportCard,
      displayOrder,
      createdById: req.user?.id,
    });
    return res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/assessment-types/:id
 * Body: { label?, appearsOnReportCard?, displayOrder?, isActive? }
 * Returns 403 if the type is a system default.
 */
export async function updateAssessmentType(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id }                                      = req.params;
    const { label, appearsOnReportCard, displayOrder, isActive } = req.body;
    const data = await ReportCardConfigService.updateAssessmentType(id, {
      label,
      appearsOnReportCard,
      displayOrder,
      isActive,
    });
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/admin/assessment-types/:id
 * Deactivates the type (isActive = false). System defaults cannot be deactivated.
 */
export async function deactivateAssessmentType(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id } = req.params;
    const data   = await ReportCardConfigService.deactivateAssessmentType(id);
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

// ── Report Card Settings handlers ─────────────────────────────

/**
 * GET /api/v1/admin/report-card-settings
 */
export async function getReportCardSettings(req, res, next) {
  try {
    const data = await ReportCardConfigService.getReportCardSettings();
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/report-card-settings
 * Body: all fields optional — upserts the single settings row.
 */
export async function upsertReportCardSettings(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const data = await ReportCardConfigService.upsertReportCardSettings(
      req.body,
      req.user?.id,
    );
    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
}
