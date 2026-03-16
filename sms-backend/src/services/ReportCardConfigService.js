/**
 * ReportCardConfigService — assessment type management and report card settings.
 *
 * Responsibilities:
 *   listAssessmentTypes()       — all active assessment types ordered by displayOrder
 *   createAssessmentType()      — create a new custom assessment type
 *   updateAssessmentType()      — update a non-system-default type
 *   deactivateAssessmentType()  — soft-deactivate (cannot delete system defaults)
 *   getReportCardSettings()     — return the single settings row
 *   upsertReportCardSettings()  — create-or-update the settings row
 */

import { prisma } from '../lib/prisma.js';

// ── Assessment Type methods ────────────────────────────────────

/**
 * Return all active assessment types ordered by displayOrder ascending.
 *
 * @returns {Promise<AssessmentTypeConfig[]>}
 */
export async function listAssessmentTypes() {
  return prisma.assessmentTypeConfig.findMany({
    where:   { isActive: true },
    orderBy: { displayOrder: 'asc' },
    select: {
      id:                     true,
      code:                   true,
      label:                  true,
      appearsOnReportCard:    true,
      contributesToAggregate: true,
      displayOrder:           true,
      isSystemDefault:        true,
      isActive:               true,
    },
  });
}

/**
 * Create a new custom assessment type.
 * isSystemDefault is always false.
 * contributesToAggregate is always false (only BOT/MOT/EOT contribute).
 *
 * @param {{ code: string, label: string, appearsOnReportCard: boolean, displayOrder: number, createdById?: string }}
 * @returns {Promise<AssessmentTypeConfig>}
 * @throws {{ status: 409 }} if code already exists
 */
export async function createAssessmentType({ code, label, appearsOnReportCard, displayOrder, createdById }) {
  const existing = await prisma.assessmentTypeConfig.findUnique({ where: { code } });
  if (existing) {
    throw Object.assign(new Error(`Assessment type code '${code}' already exists`), { status: 409 });
  }

  return prisma.assessmentTypeConfig.create({
    data: {
      code,
      label,
      appearsOnReportCard,
      contributesToAggregate: false,
      displayOrder,
      isSystemDefault: false,
      isActive:        true,
      ...(createdById && { createdById }),
    },
    select: {
      id:                     true,
      code:                   true,
      label:                  true,
      appearsOnReportCard:    true,
      contributesToAggregate: true,
      displayOrder:           true,
      isSystemDefault:        true,
      isActive:               true,
    },
  });
}

/**
 * Update a non-system-default assessment type.
 *
 * @param {string} id
 * @param {{ label?: string, appearsOnReportCard?: boolean, displayOrder?: number, isActive?: boolean }}
 * @returns {Promise<AssessmentTypeConfig>}
 * @throws {{ status: 404 }} if type not found
 * @throws {{ status: 403 }} if type is a system default
 */
export async function updateAssessmentType(id, { label, appearsOnReportCard, displayOrder, isActive }) {
  const type = await prisma.assessmentTypeConfig.findUnique({ where: { id } });
  if (!type) {
    throw Object.assign(new Error('Assessment type not found'), { status: 404 });
  }

  if (type.isSystemDefault) {
    throw Object.assign(new Error('Cannot modify system defaults'), { status: 403 });
  }

  return prisma.assessmentTypeConfig.update({
    where: { id },
    data: {
      ...(label               !== undefined && { label }),
      ...(appearsOnReportCard !== undefined && { appearsOnReportCard }),
      ...(displayOrder        !== undefined && { displayOrder }),
      ...(isActive            !== undefined && { isActive }),
    },
    select: {
      id:                     true,
      code:                   true,
      label:                  true,
      appearsOnReportCard:    true,
      contributesToAggregate: true,
      displayOrder:           true,
      isSystemDefault:        true,
      isActive:               true,
    },
  });
}

/**
 * Deactivate (soft-delete) an assessment type by setting isActive = false.
 * Cannot deactivate system default types.
 *
 * @param {string} id
 * @returns {Promise<AssessmentTypeConfig>}
 * @throws {{ status: 404 }} if type not found
 * @throws {{ status: 403 }} if type is a system default
 */
export async function deactivateAssessmentType(id) {
  const type = await prisma.assessmentTypeConfig.findUnique({ where: { id } });
  if (!type) {
    throw Object.assign(new Error('Assessment type not found'), { status: 404 });
  }

  if (type.isSystemDefault) {
    throw Object.assign(new Error('Cannot deactivate system defaults'), { status: 403 });
  }

  return prisma.assessmentTypeConfig.update({
    where: { id },
    data:  { isActive: false },
    select: {
      id:              true,
      code:            true,
      label:           true,
      isSystemDefault: true,
      isActive:        true,
    },
  });
}

// ── Report Card Settings methods ──────────────────────────────

/**
 * Return the current report card settings row.
 * Returns null if no row exists yet.
 *
 * @returns {Promise<ReportCardSetting|null>}
 */
export async function getReportCardSettings() {
  return prisma.reportCardSetting.findFirst();
}

/**
 * Upsert the report card settings row.
 * Creates the row if none exists; updates the first row otherwise.
 * All fields are optional — only provided fields are updated.
 *
 * API field → DB field mapping:
 *   showBot → showBotOnReport
 *   showMot → showMotOnReport
 *   showEot → showEotOnReport
 *   averagePeriods, showClassRank, rankingFormat, showGradeGuide,
 *   showSchoolRequirements, showNextTermDates, whoCanGenerate — direct mapping
 *
 * @param {{ showBot?: boolean, showMot?: boolean, showEot?: boolean,
 *           averagePeriods?: boolean, showClassRank?: boolean,
 *           rankingFormat?: string, showGradeGuide?: boolean,
 *           showSchoolRequirements?: boolean, showNextTermDates?: boolean,
 *           whoCanGenerate?: string }} fields
 * @param {string|undefined} updatedById
 * @returns {Promise<ReportCardSetting>}
 */
export async function upsertReportCardSettings(fields, updatedById) {
  const {
    showBot,
    showMot,
    showEot,
    averagePeriods,
    showClassRank,
    rankingFormat,
    showGradeGuide,
    showSchoolRequirements,
    showNextTermDates,
    whoCanGenerate,
  } = fields;

  const data = {
    ...(showBot               !== undefined && { showBotOnReport: showBot }),
    ...(showMot               !== undefined && { showMotOnReport: showMot }),
    ...(showEot               !== undefined && { showEotOnReport: showEot }),
    ...(averagePeriods        !== undefined && { averagePeriods }),
    ...(showClassRank         !== undefined && { showClassRank }),
    ...(rankingFormat         !== undefined && { rankingFormat }),
    ...(showGradeGuide        !== undefined && { showGradeGuide }),
    ...(showSchoolRequirements !== undefined && { showSchoolRequirements }),
    ...(showNextTermDates     !== undefined && { showNextTermDates }),
    ...(whoCanGenerate        !== undefined && { whoCanGenerate }),
    ...(updatedById           !== undefined && { updatedById }),
  };

  const existing = await prisma.reportCardSetting.findFirst();

  if (existing) {
    return prisma.reportCardSetting.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.reportCardSetting.create({ data });
}
