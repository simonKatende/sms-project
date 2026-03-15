/**
 * HouseController — thin HTTP layer for HouseService.
 */

import { validationResult } from 'express-validator';
import * as HouseService from '../services/HouseService.js';

// ── GET /api/v1/admin/houses ──────────────────────────────────
export async function listHouses(req, res, next) {
  try {
    const houses = await HouseService.listHouses({ activeOnly: false });
    res.json({ data: houses });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/v1/admin/houses/active ──────────────────────────
export async function listActiveHouses(req, res, next) {
  try {
    const houses = await HouseService.listHouses({ activeOnly: true });
    res.json({ data: houses });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/v1/admin/houses ─────────────────────────────────
export async function createHouse(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const house = await HouseService.createHouse({
      name:      req.body.name,
      colourHex: req.body.colourHex,
    });
    res.status(201).json({ data: house });
  } catch (err) {
    next(err);
  }
}

// ── PUT /api/v1/admin/houses/:id ──────────────────────────────
export async function updateHouse(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const house = await HouseService.updateHouse(req.params.id, {
      name:      req.body.name,
      colourHex: req.body.colourHex,
      isActive:  req.body.isActive,
    });
    res.json({ data: house });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/v1/admin/houses/:id ───────────────────────────
export async function deleteHouse(req, res, next) {
  try {
    await HouseService.deleteHouse(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
