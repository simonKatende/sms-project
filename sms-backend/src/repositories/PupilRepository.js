/**
 * PupilRepository — all DB queries for the pupil registration flow.
 *
 * Keeps Prisma calls out of the service layer so they can be swapped
 * or tested independently.
 */

import { prisma } from '../lib/prisma.js';

// ── Pupil ID code generation ──────────────────────────────────

/**
 * Generate the next sequential pupil ID code in SMS-YYYY-NNNN format.
 * Finds the highest NNNN for the current year and increments it.
 * Safe for concurrent inserts because the unique constraint on
 * pupils.pupil_id_code will reject duplicates.
 *
 * @returns {Promise<string>} e.g. 'HPS-2026-0042'
 */
export async function generatePupilIdCode() {
  const year   = new Date().getFullYear();
  const prefix = `HPS-${year}-`;

  // Find the highest existing code for this year
  const last = await prisma.pupil.findFirst({
    where:   { pupilIdCode: { startsWith: prefix } },
    orderBy: { pupilIdCode: 'desc' },
    select:  { pupilIdCode: true },
  });

  let nextSeq = 1;
  if (last) {
    const parts = last.pupilIdCode.split('-');
    const seq   = parseInt(parts[2], 10);
    if (!isNaN(seq)) nextSeq = seq + 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

// ── Guardian lookup ───────────────────────────────────────────

/**
 * Find a guardian by their phone_call number.
 * Returns null if not found.
 *
 * @param {string} phoneCall — normalised +256XXXXXXXXX format
 * @returns {Promise<object|null>}
 */
export async function findGuardianByPhone(phoneCall) {
  return prisma.guardian.findFirst({
    where: { phoneCall, deletedAt: null },
  });
}

// ── Core registration transaction ────────────────────────────

/**
 * Create pupil, guardian (or reuse), optional bursary, optional photo record
 * all inside a single interactive transaction.
 *
 * @param {object} data
 * @param {object} data.pupilData        — fields for pupils table
 * @param {object} data.guardianData     — fields for guardians table
 * @param {object|null} data.bursaryData — fields for pupil_bursaries (null = no bursary)
 * @param {object|null} data.photoData   — { filePath, fileSizeBytes } (null = no photo)
 * @param {string|null} data.existingGuardianId — if set, reuse this guardian
 * @returns {Promise<object>} the created pupil with includes
 */
export async function createPupilTransaction({
  pupilData,
  guardianData,
  bursaryData,
  photoData,
  existingGuardianId,
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Create the pupil
    const pupil = await tx.pupil.create({ data: pupilData });

    // 2. Guardian: reuse existing or create new
    let guardianId = existingGuardianId;
    if (!guardianId) {
      const guardian = await tx.guardian.create({ data: guardianData });
      guardianId = guardian.id;
    }

    // 3. Link pupil ↔ guardian (primary contact)
    await tx.pupilGuardian.create({
      data: {
        pupilId:          pupil.id,
        guardianId,
        isPrimaryContact: true,
      },
    });

    // 4. Bursary (optional)
    if (bursaryData) {
      await tx.pupilBursary.create({
        data: { ...bursaryData, pupilId: pupil.id },
      });
    }

    // 5. Photo record (optional — file already written to disk by this point)
    if (photoData) {
      await tx.pupilPhoto.create({
        data: { ...photoData, pupilId: pupil.id },
      });
    }

    // 6. Return the full record with all relations for the 201 response
    return tx.pupil.findUnique({
      where: { id: pupil.id },
      include: {
        stream: {
          include: { class: true },
        },
        pupilGuardians: {
          include: { guardian: true },
        },
        pupilBursaries: {
          include: { bursaryScheme: true },
        },
        pupilPhoto: true,
      },
    });
  });
}

// ── Bursary scheme lookup ─────────────────────────────────────

/**
 * Find an active bursary scheme by name.
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function findBursarySchemeByName(name) {
  return prisma.bursaryScheme.findFirst({
    where: { name, isActive: true },
  });
}

// ── Shared filter builder ─────────────────────────────────────
function buildWhere({ search, classId, streamId, section, isActive }) {
  return {
    deletedAt: null,
    ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
    ...(section && { section }),
    ...(streamId && { streamId }),
    ...(classId && { stream: { classId } }),
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName:  { contains: search, mode: 'insensitive' } },
        { pupilIdCode: { contains: search, mode: 'insensitive' } },
        { lin:        { contains: search, mode: 'insensitive' } },
      ],
    }),
  };
}

// Includes for the list view (lightweight)
const LIST_INCLUDE = {
  stream: { include: { class: true } },
  pupilGuardians: {
    where: { isPrimaryContact: true },
    include: { guardian: { select: { fullName: true, phoneCall: true } } },
    take: 1,
  },
  pupilBills: {
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: { totalAmount: true, totalPaid: true, balance: true, billingStatus: true },
  },
  pupilPhoto: { select: { filePath: true } },
};

export async function listPupils({ filters = {}, skip = 0, take = 25 }) {
  const where = buildWhere(filters);
  return prisma.pupil.findMany({
    where,
    skip,
    take,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: LIST_INCLUDE,
  });
}

export async function countPupils({ filters = {} }) {
  return prisma.pupil.count({ where: buildWhere(filters) });
}

export async function findPupilById(id) {
  return prisma.pupil.findUnique({
    where: { id, deletedAt: null },
    include: {
      stream: { include: { class: { include: { schoolSection: true } } } },
      pupilGuardians: { include: { guardian: true } },
      pupilBursaries: { include: { bursaryScheme: true } },
      pupilPhoto: true,
    },
  });
}

export async function findSiblings(pupilId, guardianIds) {
  if (!guardianIds.length) return [];
  const links = await prisma.pupilGuardian.findMany({
    where: { guardianId: { in: guardianIds }, pupilId: { not: pupilId } },
    include: {
      pupil: {
        include: {
          stream: { include: { class: true } },
          pupilPhoto: { select: { filePath: true } },
        },
      },
    },
  });
  // Deduplicate by pupilId; exclude soft-deleted pupils
  const seen = new Set();
  return links.filter(l => l.pupil && !l.pupil.deletedAt && !seen.has(l.pupil.id) && seen.add(l.pupil.id))
              .map(l => l.pupil);
}

export async function findPupilsByGuardian(guardianId) {
  const links = await prisma.pupilGuardian.findMany({
    where: { guardianId },
    include: {
      pupil: {
        include: {
          stream: { include: { class: true } },
          pupilPhoto: { select: { filePath: true } },
          pupilBills: { orderBy: { createdAt: 'desc' }, take: 1,
            select: { totalAmount: true, totalPaid: true, billingStatus: true } },
        },
      },
    },
  });
  return links.filter(l => l.pupil && !l.pupil.deletedAt).map(l => l.pupil);
}

export async function findAllForExport({ filters = {} }) {
  return prisma.pupil.findMany({
    where: buildWhere(filters),
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    include: {
      stream: { include: { class: true } },
      pupilGuardians: {
        where: { isPrimaryContact: true },
        include: { guardian: { select: { fullName: true, phoneCall: true } } },
        take: 1,
      },
      pupilBursaries: { where: { isActive: true }, take: 1 },
    },
  });
}

export async function updatePupil(id, data) {
  return prisma.pupil.update({ where: { id }, data });
}

export async function softDeletePupil(id) {
  return prisma.pupil.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}
