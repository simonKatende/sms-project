/**
 * PupilController — HTTP layer for pupil endpoints.
 *
 * Extracts and shapes request data, delegates to PupilService,
 * returns the formatted response. No business logic here.
 */

import { validationResult } from 'express-validator';
import * as PupilService from '../services/PupilService.js';
import { savePhoto }     from '../integrations/photo.js';
import { prisma }        from '../lib/prisma.js';

// ── POST /api/v1/pupils ───────────────────────────────────────

export async function registerPupil(req, res) {
  // Validation errors from express-validator
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const body = req.body;

  // ── Pupil fields ──────────────────────────────────────────
  const pupilFields = {
    lin:               body.lin,
    schoolpayCode:     body.schoolpayCode,
    firstName:         body.firstName,
    lastName:          body.lastName,
    otherNames:        body.otherNames,
    dateOfBirth:       body.dateOfBirth,
    gender:            body.gender,
    religion:          body.religion,
    house:             body.house,
    medicalConditions: body.medicalConditions,
    formerSchool:      body.formerSchool,
    streamId:          body.streamId,
    section:           body.section,
    enrolmentDate:     body.enrolmentDate,
  };

  // ── Mother (optional) ─────────────────────────────────────
  const m      = body.mother ?? {};
  const mother = m.fullName ? {
    fullName: m.fullName,
    phone:    m.phone    ?? null,
    email:    m.email    ?? null,
    address:  m.address  ?? null,
    nin:      m.nin      ?? null,
  } : null;

  // ── Father (optional) ─────────────────────────────────────
  const f      = body.father ?? {};
  const father = f.fullName ? {
    fullName: f.fullName,
    phone:    f.phone    ?? null,
    email:    f.email    ?? null,
    address:  f.address  ?? null,
    nin:      f.nin      ?? null,
  } : null;

  // ── Contact person (required) ─────────────────────────────
  const cp = body.contactPerson ?? {};
  const contactPerson = {
    fullName:          cp.fullName,
    relationship:      cp.relationship,
    primaryPhone:      cp.primaryPhone,
    secondaryPhone:    cp.secondaryPhone    ?? null,
    whatsappIndicator: cp.whatsappIndicator ?? 'primary',
    email:             cp.email             ?? null,
    physicalAddress:   cp.physicalAddress   ?? null,
  };

  // ── Bursary fields (optional) ─────────────────────────────
  let bursaryFields = null;
  if (body.isBursary === true || body.isBursary === 'true') {
    const b = body.bursary ?? {};
    bursaryFields = {
      bursarySchemeName:   b.schemeName,
      standardFeesAtAward: parseInt(b.standardFeesAtAward, 10),
      discountUgx:         parseInt(b.discountUgx, 10),
    };
  }

  const pupil = await PupilService.registerPupil({
    pupilFields,
    mother,
    father,
    contactPerson,
    bursaryFields,
    photoFile:   req.file ?? null,
    createdById: req.user.id,
    ipAddress:   req.ip,
  });

  return res.status(201).json({ data: pupil });
}

// ── GET /api/v1/pupils ────────────────────────────────────────
export async function listPupils(req, res) {
  const result = await PupilService.listPupils({ query: req.query });
  return res.status(200).json(result);
}

// ── GET /api/v1/pupils/contact-person-check ───────────────────
export async function contactPersonCheck(req, res) {
  const { phone } = req.query;
  if (!phone) return res.status(422).json({ error: 'phone query param required' });
  const result = await PupilService.contactPersonLookup(phone);
  return res.status(200).json(result);
}

// ── GET /api/v1/pupils/export ─────────────────────────────────
export async function exportPupils(req, res) {
  const buffer = await PupilService.exportPupils({ query: req.query });
  const date   = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pupils-${date}.xlsx"`);
  return res.status(200).send(buffer);
}

// ── GET /api/v1/pupils/family/:contactPersonId ────────────────
export async function getPupilFamily(req, res) {
  const pupils = await PupilService.getPupilFamily(req.params.contactPersonId);
  return res.status(200).json({ data: pupils });
}

// ── GET /api/v1/pupils/:id ────────────────────────────────────
export async function getPupilById(req, res) {
  const pupil = await PupilService.getPupilById(req.params.id);
  return res.status(200).json({ data: pupil });
}

// ── PUT /api/v1/pupils/:id ────────────────────────────────────
export async function updatePupil(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const pupil = await PupilService.updatePupil(
    req.params.id,
    req.body,
    { userId: req.user.id, ipAddress: req.ip },
  );
  return res.status(200).json({ data: pupil });
}

// ── DELETE /api/v1/pupils/:id ─────────────────────────────────
export async function deletePupil(req, res) {
  await PupilService.deletePupil(req.params.id, { userId: req.user.id, ipAddress: req.ip });
  return res.status(204).send();
}

// ── POST /api/v1/pupils/:id/photo ─────────────────────────────
export async function uploadPhoto(req, res) {
  const { id } = req.params;

  if (!req.file) return res.status(422).json({ error: 'No photo file provided' });

  const existing = await prisma.pupil.findUnique({
    where:   { id, deletedAt: null },
    include: { pupilPhoto: true },
  });
  if (!existing) return res.status(404).json({ error: 'Pupil not found' });

  const filePath = await savePhoto(req.file.buffer, id);

  await prisma.pupilPhoto.upsert({
    where:  { pupilId: id },
    create: { pupilId: id, filePath, fileSizeBytes: req.file.size, uploadedById: req.user.id },
    update: { filePath, fileSizeBytes: req.file.size, uploadedById: req.user.id },
  });

  return res.status(200).json({ data: { filePath } });
}
