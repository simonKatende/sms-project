/**
 * AcademicCalendarController — thin HTTP adapter for AcademicCalendarService.
 */

import { validationResult } from 'express-validator';
import * as CalendarService from '../services/AcademicCalendarService.js';

// ── Academic years ─────────────────────────────────────────────

// GET /api/v1/admin/academic-years
export async function listAcademicYears(req, res, next) {
  try {
    const years = await CalendarService.listAcademicYears();
    res.json({ data: years });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/academic-years
export async function createAcademicYear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year = await CalendarService.createAcademicYear({
      yearLabel: req.body.yearLabel,
      startDate: req.body.startDate,
      endDate:   req.body.endDate,
      isCurrent: req.body.isCurrent ?? false,
    });
    res.status(201).json({ data: year });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/academic-years/:id
export async function updateAcademicYear(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year = await CalendarService.updateAcademicYear(req.params.id, {
      yearLabel: req.body.yearLabel,
      startDate: req.body.startDate,
      endDate:   req.body.endDate,
      isCurrent: req.body.isCurrent,
    });
    res.json({ data: year });
  } catch (err) {
    next(err);
  }
}

// ── Terms ──────────────────────────────────────────────────────

// GET /api/v1/admin/terms?academicYearId=X
export async function listTerms(req, res, next) {
  try {
    const terms = await CalendarService.listTerms(req.query.academicYearId);
    res.json({ data: terms });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/terms
export async function createTerm(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const term = await CalendarService.createTerm({
      academicYearId:        req.body.academicYearId,
      termNumber:            req.body.termNumber,
      termLabel:             req.body.termLabel,
      startDate:             req.body.startDate,
      endDate:               req.body.endDate,
      nextTermStartDay:      req.body.nextTermStartDay,
      nextTermStartBoarding: req.body.nextTermStartBoarding,
      feesDueDate:           req.body.feesDueDate,
      isCurrent:             req.body.isCurrent ?? false,
    });
    res.status(201).json({ data: term });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/terms/:id
export async function updateTerm(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const term = await CalendarService.updateTerm(req.params.id, {
      termNumber:            req.body.termNumber,
      termLabel:             req.body.termLabel,
      startDate:             req.body.startDate,
      endDate:               req.body.endDate,
      nextTermStartDay:      req.body.nextTermStartDay,
      nextTermStartBoarding: req.body.nextTermStartBoarding,
      feesDueDate:           req.body.feesDueDate,
      isCurrent:             req.body.isCurrent,
    });
    res.json({ data: term });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/admin/terms/:id
export async function deleteTerm(req, res, next) {
  try {
    await CalendarService.deleteTerm(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
