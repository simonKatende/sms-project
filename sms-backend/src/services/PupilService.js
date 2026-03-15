/**
 * PupilService — pupil registration business logic.
 *
 * Orchestrates:
 *   1. pupil ID code generation
 *   2. contact person deduplication / family linking (find by primaryPhone, create if new)
 *   3. optional mother / father parent records
 *   4. bursary scheme validation
 *   5. photo processing (via PhotoAdapter)
 *   6. atomic DB transaction (via PupilRepository)
 *   7. audit log
 */

import * as XLSX from 'xlsx';
import { savePhoto } from '../integrations/photo.js';
import * as PupilRepository from '../repositories/PupilRepository.js';
import { prisma } from '../lib/prisma.js';

// ── Internal helpers ──────────────────────────────────────────

async function writeAudit({ userId, action, entityType, entityId, ipAddress, notes }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId: entityId ?? undefined, ipAddress, notes },
    });
  } catch (err) {
    console.error('[AuditService] Failed to write audit log:', err.message);
  }
}

// ── registerPupil ─────────────────────────────────────────────

/**
 * Register a new pupil with three-level contact structure, optional bursary,
 * and optional photo.
 *
 * @param {object}      params
 * @param {object}      params.pupilFields    — validated pupil form fields
 * @param {object|null} params.mother         — { fullName, phone, email, address, nin } or null
 * @param {object|null} params.father         — { fullName, phone, email, address, nin } or null
 * @param {object}      params.contactPerson  — { fullName, relationship, primaryPhone,
 *                                               secondaryPhone, whatsappIndicator, email,
 *                                               physicalAddress } (required)
 * @param {object|null} params.bursaryFields  — bursary fields (null = not a bursary pupil)
 * @param {object|null} params.photoFile      — multer file object (req.file) or null
 * @param {string}      params.createdById    — authenticated user UUID
 * @param {string}      [params.ipAddress]    — for audit log
 * @returns {Promise<object>} full pupil record with relations
 */
export async function registerPupil({
  pupilFields,
  mother,
  father,
  contactPerson,
  bursaryFields,
  photoFile,
  createdById,
  ipAddress,
}) {
  // ── 1. Generate pupil ID code ───────────────────────────────
  const pupilIdCode = await PupilRepository.generatePupilIdCode();

  // ── 2. Contact person family linking ────────────────────────
  // If another pupil already shares this primary phone, reuse the record.
  const existingCP = await PupilRepository.findContactPersonByPhone(contactPerson.primaryPhone);
  const existingContactPersonId = existingCP?.id ?? null;

  // ── 3. Bursary scheme validation ────────────────────────────
  let bursaryData = null;
  if (bursaryFields) {
    const scheme = await PupilRepository.findBursarySchemeByName(bursaryFields.bursarySchemeName);
    if (!scheme) {
      throw Object.assign(
        new Error(`Bursary scheme '${bursaryFields.bursarySchemeName}' not found or inactive`),
        { status: 422 },
      );
    }

    const agreedNetFeesUgx = bursaryFields.standardFeesAtAward - bursaryFields.discountUgx;
    if (agreedNetFeesUgx <= 0) {
      throw Object.assign(
        new Error('agreedNetFeesUgx must be greater than 0 (discount cannot equal or exceed standard fees)'),
        { status: 422 },
      );
    }

    bursaryData = {
      bursarySchemeId:     scheme.id,
      standardFeesAtAward: bursaryFields.standardFeesAtAward,
      discountUgx:         bursaryFields.discountUgx,
      agreedNetFeesUgx,
      sectionAtAward:      pupilFields.section,
      awardedDate:         new Date(),
      awardedById:         createdById,
    };
  }

  // ── 4. Build pupil data object ──────────────────────────────
  const pupilData = {
    pupilIdCode,
    lin:               pupilFields.lin             ?? null,
    schoolpayCode:     pupilFields.schoolpayCode   ?? null,
    firstName:         pupilFields.firstName,
    lastName:          pupilFields.lastName,
    otherNames:        pupilFields.otherNames       ?? null,
    dateOfBirth:       new Date(pupilFields.dateOfBirth),
    gender:            pupilFields.gender,
    religion:          pupilFields.religion         ?? null,
    houseId:           pupilFields.houseId          ?? null,
    medicalConditions: pupilFields.medicalConditions ?? null,
    formerSchool:      pupilFields.formerSchool     ?? null,
    streamId:          pupilFields.streamId         ?? null,
    section:           pupilFields.section,
    enrolmentDate:     new Date(pupilFields.enrolmentDate ?? new Date()),
    createdById,
  };

  // ── 5. Build parent data objects ────────────────────────────
  const motherData = mother?.fullName ? {
    fullName: mother.fullName,
    phone:    mother.phone    ?? null,
    email:    mother.email    ?? null,
    address:  mother.address  ?? null,
    nin:      mother.nin      ?? null,
  } : null;

  const fatherData = father?.fullName ? {
    fullName: father.fullName,
    phone:    father.phone    ?? null,
    email:    father.email    ?? null,
    address:  father.address  ?? null,
    nin:      father.nin      ?? null,
  } : null;

  // ── 6. Build contact person data (only when creating a new one) ─
  const contactPersonData = existingContactPersonId ? null : {
    fullName:          contactPerson.fullName,
    relationship:      contactPerson.relationship,
    primaryPhone:      contactPerson.primaryPhone,
    secondaryPhone:    contactPerson.secondaryPhone    ?? null,
    whatsappIndicator: contactPerson.whatsappIndicator ?? 'primary',
    email:             contactPerson.email             ?? null,
    physicalAddress:   contactPerson.physicalAddress   ?? null,
  };

  // ── 7. Persist transaction ───────────────────────────────────
  // Photo is NOT yet on disk — handled post-transaction (see step 8).
  const pupilRecord = await PupilRepository.createPupilTransaction({
    pupilData,
    motherData,
    fatherData,
    contactPersonData,
    existingContactPersonId,
    bursaryData,
    photoData: null,  // handled below after we have the pupil UUID
  });

  // ── 8. Photo processing (post-transaction) ──────────────────
  let finalRecord = pupilRecord;
  if (photoFile) {
    try {
      const filePath = await savePhoto(photoFile.buffer, pupilRecord.id);

      await prisma.pupilPhoto.create({
        data: {
          pupilId:      pupilRecord.id,
          filePath,
          fileSizeBytes: photoFile.size ?? null,
          uploadedById:  createdById,
        },
      });

      // Re-fetch to include the photo in the response
      finalRecord = await prisma.pupil.findUnique({
        where: { id: pupilRecord.id },
        include: {
          stream:              { include: { class: true } },
          pupilParents:        true,
          pupilContactPersons: { include: { contactPerson: true } },
          pupilBursaries:      { include: { bursaryScheme: true } },
          pupilPhoto:          true,
        },
      });
    } catch (err) {
      // Photo failure is non-fatal — pupil is already registered.
      console.error('[PupilService] Photo processing failed:', err.message);
    }
  }

  // ── 9. Audit ────────────────────────────────────────────────
  await writeAudit({
    userId:     createdById,
    action:     'PUPIL_CREATED',
    entityType: 'pupils',
    entityId:   finalRecord.id,
    ipAddress,
    notes:      `Pupil registered: ${finalRecord.firstName} ${finalRecord.lastName} (${pupilIdCode})`,
  });

  return finalRecord;
}

// ── listPupils ────────────────────────────────────────────────
export async function listPupils({ query }) {
  const page  = Math.max(1, parseInt(query.page  ?? 1, 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? 25, 10)));
  const skip  = (page - 1) * limit;

  const filters = {
    search:   query.search   ?? undefined,
    classId:  query.classId  ?? undefined,
    streamId: query.streamId ?? undefined,
    section:  query.section  ?? undefined,
    isActive: query.isActive ?? 'true',
  };

  const [pupils, total] = await Promise.all([
    PupilRepository.listPupils({ filters, skip, take: limit }),
    PupilRepository.countPupils({ filters }),
  ]);

  return {
    data:  pupils,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

// ── getPupilById ──────────────────────────────────────────────
export async function getPupilById(id) {
  const pupil = await PupilRepository.findPupilById(id);
  if (!pupil) throw Object.assign(new Error('Pupil not found'), { status: 404 });

  const contactPersonIds = pupil.pupilContactPersons.map(pcp => pcp.contactPersonId);

  const [siblings, latestResult, recentComms, currentTerm] = await Promise.all([
    PupilRepository.findSiblings(id, contactPersonIds),
    prisma.pupilTermResult.findFirst({
      where:   { pupilId: id },
      orderBy: { createdAt: 'desc' },
      include: { term: true, assessmentPeriod: true },
    }),
    prisma.communicationLog.findMany({
      where:   { pupilId: id },
      orderBy: { createdAt: 'desc' },
      take:    5,
      include: { contactPerson: { select: { fullName: true } } },
    }),
    prisma.term.findFirst({ where: { isCurrent: true } }),
  ]);

  let currentBill = null;
  if (currentTerm) {
    currentBill = await prisma.pupilBill.findFirst({
      where:   { pupilId: id, termId: currentTerm.id },
      include: { billLineItems: { include: { feeCategory: true } } },
    });
  }

  return { ...pupil, siblings, latestResult, recentComms, currentBill };
}

// ── getPupilFamily ────────────────────────────────────────────
export async function getPupilFamily(contactPersonId) {
  return PupilRepository.findPupilsByContactPerson(contactPersonId);
}

// ── exportPupils ──────────────────────────────────────────────
export async function exportPupils({ query }) {
  const filters = {
    search:   query.search   ?? undefined,
    classId:  query.classId  ?? undefined,
    streamId: query.streamId ?? undefined,
    section:  query.section  ?? undefined,
    isActive: query.isActive ?? 'true',
  };

  const pupils = await PupilRepository.findAllForExport({ filters });

  const rows = pupils.map(p => {
    const primaryCP = p.pupilContactPersons[0]?.contactPerson ?? {};
    return {
      'Pupil ID':       p.pupilIdCode,
      'First Name':     p.firstName,
      'Last Name':      p.lastName,
      'Class':          p.stream?.class?.name ?? '',
      'Stream':         p.stream?.name ?? '',
      'Section':        p.section,
      'LIN':            p.lin ?? '',
      'SchoolPay Code': p.schoolpayCode ?? '',
      'Contact Name':   primaryCP.fullName ?? '',
      'Contact Phone':  primaryCP.primaryPhone ?? '',
      'Bursary':        p.pupilBursaries.length > 0 ? 'Yes' : 'No',
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [14, 16, 16, 10, 12, 10, 14, 16, 24, 16, 8].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Pupils');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ── updatePupil ───────────────────────────────────────────────
export async function updatePupil(id, fields, { userId, ipAddress }) {
  const existing = await PupilRepository.findPupilById(id);
  if (!existing) throw Object.assign(new Error('Pupil not found'), { status: 404 });

  const data = {};
  const allowed = ['firstName','lastName','otherNames','dateOfBirth','gender','religion',
    'houseId','medicalConditions','formerSchool','streamId','section','enrolmentDate',
    'lin','schoolpayCode','isActive'];
  for (const key of allowed) {
    if (fields[key] !== undefined) data[key] = fields[key];
  }
  if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
  if (data.enrolmentDate) data.enrolmentDate = new Date(data.enrolmentDate);

  const updated = await PupilRepository.updatePupil(id, data);

  await writeAudit({ userId, action: 'PUPIL_UPDATED', entityType: 'pupils',
    entityId: id, ipAddress, notes: `Updated: ${Object.keys(data).join(', ')}` });

  return updated;
}

// ── deletePupil ───────────────────────────────────────────────
export async function deletePupil(id, { userId, ipAddress }) {
  const existing = await PupilRepository.findPupilById(id);
  if (!existing) throw Object.assign(new Error('Pupil not found'), { status: 404 });

  await PupilRepository.softDeletePupil(id);

  await writeAudit({ userId, action: 'PUPIL_DELETED', entityType: 'pupils',
    entityId: id, ipAddress,
    notes: `Soft deleted: ${existing.firstName} ${existing.lastName} (${existing.pupilIdCode})` });
}

// ── contactPersonLookup ───────────────────────────────────────
export async function contactPersonLookup(phone) {
  const cp = await PupilRepository.findContactPersonByPhone(phone);
  return cp
    ? { exists: true,  contactPerson: { id: cp.id, fullName: cp.fullName,
        relationship: cp.relationship, primaryPhone: cp.primaryPhone,
        secondaryPhone: cp.secondaryPhone, whatsappIndicator: cp.whatsappIndicator } }
    : { exists: false, contactPerson: null };
}
