/**
 * ClassStreamController — HTTP handlers for classes, streams, and school sections.
 */

import { validationResult } from 'express-validator';
import * as Repo from '../repositories/ClassStreamRepository.js';

function sendErrors(res, errors) {
  return res.status(422).json({ errors: errors.array() });
}

// ── School sections ────────────────────────────────────────────

export async function listSchoolSections(_req, res) {
  const sections = await Repo.findAllSchoolSections();
  res.json({ data: sections });
}

// ── Classes ────────────────────────────────────────────────────

export async function listClasses(req, res) {
  const includeInactive = req.query.includeInactive === 'true';
  const classes = await Repo.findAllClasses({ includeInactive });
  res.json({ data: classes });
}

export async function createClass(req, res) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return sendErrors(res, errs);

  const { schoolSectionId, name, levelOrder } = req.body;
  const cls = await Repo.createClass({ schoolSectionId, name, levelOrder: parseInt(levelOrder, 10) });
  res.status(201).json({ data: cls });
}

export async function updateClass(req, res) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return sendErrors(res, errs);

  const existing = await Repo.findClassById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Class not found' });

  const { name, levelOrder, isActive } = req.body;
  const updated = await Repo.updateClass(req.params.id, {
    name,
    levelOrder: levelOrder !== undefined ? parseInt(levelOrder, 10) : undefined,
    isActive,
  });
  res.json({ data: updated });
}

// ── Streams ────────────────────────────────────────────────────

export async function listStreams(req, res) {
  const { classId, academicYearId, includeInactive } = req.query;
  const streams = await Repo.findStreams({
    classId,
    academicYearId,
    includeInactive: includeInactive === 'true',
  });
  res.json({ data: streams });
}

export async function createStream(req, res) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return sendErrors(res, errs);

  const { classId, name, academicYearId, classTeacherId } = req.body;
  const stream = await Repo.createStream({ classId, name, academicYearId, classTeacherId });
  res.status(201).json({ data: stream });
}

export async function updateStream(req, res) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) return sendErrors(res, errs);

  const existing = await Repo.findStreamById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Stream not found' });

  const { name, classTeacherId, isActive } = req.body;
  const updated = await Repo.updateStream(req.params.id, { name, classTeacherId, isActive });
  res.json({ data: updated });
}

export async function listAcademicYears(_req, res) {
  const years = await Repo.findAllAcademicYears();
  res.json({ data: years });
}
