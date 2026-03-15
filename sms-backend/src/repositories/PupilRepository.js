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

// ── Contact person lookup ─────────────────────────────────────

/**
 * Find a contact person by their primary phone number.
 * Returns null if not found. Used for family linking.
 *
 * @param {string} primaryPhone — normalised +256XXXXXXXXX format
 * @returns {Promise<object|null>}
 */
export async function findContactPersonByPhone(primaryPhone) {
  return prisma.contactPerson.findFirst({
    where: { primaryPhone, deletedAt: null },
  });
}

// ── Core registration transaction ────────────────────────────

/**
 * Create pupil, optional parents (mother/father), contact person (or reuse),
 * optional bursary, and optional photo record — all inside a single transaction.
 *
 * @param {object} data
 * @param {object}      data.pupilData              — fields for pupils table
 * @param {object|null} data.motherData             — fields for pupil_parents (parentType='mother'), or null
 * @param {object|null} data.fatherData             — fields for pupil_parents (parentType='father'), or null
 * @param {object|null} data.contactPersonData      — fields for contact_persons (null if reusing existing)
 * @param {string|null} data.existingContactPersonId — if set, reuse this contact_person record
 * @param {object|null} data.bursaryData            — fields for pupil_bursaries (null = no bursary)
 * @param {object|null} data.photoData              — { filePath, fileSizeBytes } (null = no photo)
 * @returns {Promise<object>} the created pupil with all relations
 */
export async function createPupilTransaction({
  pupilData,
  motherData,
  fatherData,
  contactPersonData,
  existingContactPersonId,
  bursaryData,
  photoData,
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Create the pupil
    const pupil = await tx.pupil.create({ data: pupilData });

    // 2. Mother (optional)
    if (motherData) {
      await tx.pupilParent.create({
        data: { ...motherData, pupilId: pupil.id, parentType: 'mother' },
      });
    }

    // 3. Father (optional)
    if (fatherData) {
      await tx.pupilParent.create({
        data: { ...fatherData, pupilId: pupil.id, parentType: 'father' },
      });
    }

    // 4. Contact person: reuse existing or create new
    let contactPersonId = existingContactPersonId;
    if (!contactPersonId) {
      const cp = await tx.contactPerson.create({ data: contactPersonData });
      contactPersonId = cp.id;
    }

    // 5. Link pupil ↔ contact person
    await tx.pupilContactPerson.create({
      data: { pupilId: pupil.id, contactPersonId, isPrimary: true },
    });

    // 6. Bursary (optional)
    if (bursaryData) {
      await tx.pupilBursary.create({
        data: { ...bursaryData, pupilId: pupil.id },
      });
    }

    // 7. Photo record (optional — file already written to disk by this point)
    if (photoData) {
      await tx.pupilPhoto.create({
        data: { ...photoData, pupilId: pupil.id },
      });
    }

    // 8. Return the full record with all relations for the 201 response
    return tx.pupil.findUnique({
      where: { id: pupil.id },
      include: {
        stream:              { include: { class: true } },
        pupilParents:        true,
        pupilContactPersons: { include: { contactPerson: true } },
        pupilBursaries:      { include: { bursaryScheme: true } },
        pupilPhoto:          true,
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
  pupilContactPersons: {
    where: { isPrimary: true },
    include: { contactPerson: { select: { fullName: true, primaryPhone: true, relationship: true } } },
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
      stream:              { include: { class: { include: { schoolSection: true } } } },
      pupilParents:        true,
      pupilContactPersons: { include: { contactPerson: true } },
      pupilBursaries:      { include: { bursaryScheme: true } },
      pupilPhoto:          true,
    },
  });
}

export async function findSiblings(pupilId, contactPersonIds) {
  if (!contactPersonIds.length) return [];
  const links = await prisma.pupilContactPerson.findMany({
    where: { contactPersonId: { in: contactPersonIds }, pupilId: { not: pupilId } },
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

export async function findPupilsByContactPerson(contactPersonId) {
  const links = await prisma.pupilContactPerson.findMany({
    where: { contactPersonId },
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
      pupilContactPersons: {
        where: { isPrimary: true },
        include: { contactPerson: { select: { fullName: true, primaryPhone: true } } },
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
