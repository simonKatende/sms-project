/**
 * AdminSettingsController — HTTP layer for /api/v1/admin/settings/*
 *
 * No business logic here — delegates entirely to SchoolSettingsService.
 */

import { validationResult } from 'express-validator';
import * as SchoolSettingsService from '../services/SchoolSettingsService.js';

// ── Helper: build base URL from request ──────────────────────

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

// ── GET /api/v1/admin/settings/profile ────────────────────────

export async function getProfile(req, res) {
  const profile = await SchoolSettingsService.getProfile(baseUrl(req));
  return res.status(200).json({ data: profile });
}

// ── PUT /api/v1/admin/settings/profile ────────────────────────

export async function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const profile = await SchoolSettingsService.updateProfile({
    fields:   req.body,
    logoFile: req.file ?? null,
    baseUrl:  baseUrl(req),
  });

  return res.status(200).json({ data: profile });
}
