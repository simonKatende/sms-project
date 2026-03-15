/**
 * HouseService — CRUD for configurable school houses.
 *
 * Business rules:
 *  - name must be unique (enforced by DB unique constraint)
 *  - A house with assigned pupils cannot be deleted — deactivate instead
 *  - GET /active returns only isActive=true houses (for dropdown population)
 */

import { prisma } from '../lib/prisma.js';

// ── listHouses ────────────────────────────────────────────────

/**
 * Return all houses, optionally filtered to active only.
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.activeOnly=false]
 * @returns {Promise<Array>}
 */
export async function listHouses({ activeOnly = false } = {}) {
  return prisma.house.findMany({
    where:   activeOnly ? { isActive: true } : undefined,
    include: { _count: { select: { pupils: true } } },
    orderBy: { name: 'asc' },
  });
}

// ── createHouse ───────────────────────────────────────────────

/**
 * Create a new house.
 *
 * @param {object} fields
 * @param {string} fields.name       — required, unique
 * @param {string} [fields.colourHex] — optional hex colour e.g. #F59E0B
 * @returns {Promise<object>}
 */
export async function createHouse({ name, colourHex }) {
  const existing = await prisma.house.findUnique({ where: { name } });
  if (existing) {
    throw Object.assign(new Error(`A house named '${name}' already exists`), { status: 409 });
  }

  return prisma.house.create({
    data: {
      name,
      colourHex: colourHex ?? null,
      isActive:  true,
    },
    include: { _count: { select: { pupils: true } } },
  });
}

// ── updateHouse ───────────────────────────────────────────────

/**
 * Update a house's name, colour, or active status.
 * Uniqueness of name is checked manually to give a clear error.
 *
 * @param {string} id
 * @param {object} fields
 * @param {string} [fields.name]
 * @param {string} [fields.colourHex]
 * @param {boolean} [fields.isActive]
 * @returns {Promise<object>}
 */
export async function updateHouse(id, { name, colourHex, isActive }) {
  const existing = await prisma.house.findUnique({ where: { id } });
  if (!existing) {
    throw Object.assign(new Error('House not found'), { status: 404 });
  }

  // Check name uniqueness if name is being changed
  if (name && name !== existing.name) {
    const conflict = await prisma.house.findUnique({ where: { name } });
    if (conflict) {
      throw Object.assign(new Error(`A house named '${name}' already exists`), { status: 409 });
    }
  }

  const data = {};
  if (name      !== undefined) data.name      = name;
  if (colourHex !== undefined) data.colourHex = colourHex ?? null;
  if (isActive  !== undefined) data.isActive  = isActive;

  return prisma.house.update({
    where:   { id },
    data,
    include: { _count: { select: { pupils: true } } },
  });
}

// ── deleteHouse ───────────────────────────────────────────────

/**
 * Delete a house — blocked if any pupils are currently assigned to it.
 * Callers should deactivate instead.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteHouse(id) {
  const existing = await prisma.house.findUnique({
    where:   { id },
    include: { _count: { select: { pupils: true } } },
  });
  if (!existing) {
    throw Object.assign(new Error('House not found'), { status: 404 });
  }
  if (existing._count.pupils > 0) {
    throw Object.assign(
      new Error(
        `Cannot delete: ${existing._count.pupils} pupil(s) are assigned to this house. Deactivate it instead.`
      ),
      { status: 409 },
    );
  }

  await prisma.house.delete({ where: { id } });
}
