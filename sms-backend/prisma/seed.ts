/**
 * SMS Database Seed
 * Run: npx tsx prisma/seed.ts
 *
 * Idempotent — safe to run multiple times.
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// 1. ROLES
// ─────────────────────────────────────────────────────────────────────────────
async function seedRoles() {
  const roles = [
    {
      name: 'system_admin',
      displayName: 'System Administrator',
      description: 'Full system access — all modules, settings, and user management.',
    },
    {
      name: 'head_teacher',
      displayName: 'Head Teacher',
      description: 'View all reports and add Head Teacher remarks on pupil report cards.',
    },
    {
      name: 'dos',
      displayName: 'Director of Studies',
      description: 'Manages academic setup, edits scores, generates and prints report cards.',
    },
    {
      name: 'bursar',
      displayName: 'Bursar',
      description: 'Manages all fees, billing, bursaries, and parent fee communication.',
    },
    {
      name: 'class_teacher',
      displayName: 'Class Teacher',
      description: 'Enters pupil scores only — cannot edit after the period is locked and cannot generate report cards.',
    },
    {
      name: 'parent',
      displayName: 'Parent / Guardian',
      description: 'Read-only parent portal access (future release — low priority).',
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { displayName: role.displayName, description: role.description },
      create: role,
    });
  }

  console.log('✓  Roles seeded (6)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GRADING SCALE + GRADE ENTRIES
// ─────────────────────────────────────────────────────────────────────────────
async function seedGradingScale() {
  const SCALE_NAME = 'Standard Uganda MoES Scale';

  // GradingScale has no @unique on name, so we findFirst then create/update
  let scale = await prisma.gradingScale.findFirst({ where: { name: SCALE_NAME } });

  if (!scale) {
    scale = await prisma.gradingScale.create({
      data: {
        name: SCALE_NAME,
        isActive: true,
        description: 'Uganda Ministry of Education and Sports 9-point grading scale (D1–F9). Configurable by system admin.',
      },
    });
  } else {
    scale = await prisma.gradingScale.update({
      where: { id: scale.id },
      data: { isActive: true },
    });
  }

  const gradeEntries = [
    { gradeLabel: 'D1', minScore: 90, maxScore: 100, pointsValue: 1, isFail: false, displayOrder: 1 },
    { gradeLabel: 'D2', minScore: 80, maxScore: 89,  pointsValue: 2, isFail: false, displayOrder: 2 },
    { gradeLabel: 'C3', minScore: 75, maxScore: 79,  pointsValue: 3, isFail: false, displayOrder: 3 },
    { gradeLabel: 'C4', minScore: 70, maxScore: 74,  pointsValue: 4, isFail: false, displayOrder: 4 },
    { gradeLabel: 'C5', minScore: 60, maxScore: 69,  pointsValue: 5, isFail: false, displayOrder: 5 },
    { gradeLabel: 'C6', minScore: 50, maxScore: 59,  pointsValue: 6, isFail: false, displayOrder: 6 },
    { gradeLabel: 'P7', minScore: 40, maxScore: 49,  pointsValue: 7, isFail: false, displayOrder: 7 },
    { gradeLabel: 'P8', minScore: 30, maxScore: 39,  pointsValue: 8, isFail: false, displayOrder: 8 },
    { gradeLabel: 'F9', minScore: 0,  maxScore: 29,  pointsValue: 9, isFail: true,  displayOrder: 9 },
  ];

  for (const entry of gradeEntries) {
    await prisma.gradingScaleEntry.upsert({
      where: {
        gradingScaleId_gradeLabel: { gradingScaleId: scale.id, gradeLabel: entry.gradeLabel },
      },
      update: {
        minScore: entry.minScore,
        maxScore: entry.maxScore,
        pointsValue: entry.pointsValue,
        isFail: entry.isFail,
        displayOrder: entry.displayOrder,
      },
      create: { gradingScaleId: scale.id, ...entry },
    });
  }

  console.log(`✓  Grading scale seeded: "${SCALE_NAME}" (9 grade entries)`);

  return scale.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DIVISION BOUNDARIES
// ─────────────────────────────────────────────────────────────────────────────
async function seedDivisionBoundaries(gradingScaleId: string) {
  const existing = await prisma.divisionBoundary.count({ where: { gradingScaleId } });

  if (existing === 0) {
    await prisma.divisionBoundary.createMany({
      data: [
        { gradingScaleId, divisionLabel: 'Division I',   romanNumeral: 'I',   minAggregate: 4,  maxAggregate: 12, isUngraded: false, displayOrder: 1 },
        { gradingScaleId, divisionLabel: 'Division II',  romanNumeral: 'II',  minAggregate: 13, maxAggregate: 23, isUngraded: false, displayOrder: 2 },
        { gradingScaleId, divisionLabel: 'Division III', romanNumeral: 'III', minAggregate: 24, maxAggregate: 29, isUngraded: false, displayOrder: 3 },
        { gradingScaleId, divisionLabel: 'Division IV',  romanNumeral: 'IV',  minAggregate: 30, maxAggregate: 34, isUngraded: false, displayOrder: 4 },
        { gradingScaleId, divisionLabel: 'Ungraded',     romanNumeral: 'U',   minAggregate: 35, maxAggregate: 36, isUngraded: true,  displayOrder: 5 },
      ],
    });
    console.log('✓  Division boundaries seeded (5: Div I–IV + U)');
  } else {
    console.log(`✓  Division boundaries already present (${existing}) — skipped`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCHOOL SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
async function seedSchoolSections() {
  const sections = [
    {
      name: 'Lower Primary',
      code: 'LOWER',
      rankingMethod: 'average',
      classesDescription: 'P.1 - P.3',
    },
    {
      name: 'Upper Primary',
      code: 'UPPER',
      rankingMethod: 'aggregate',
      classesDescription: 'P.4 - P.7',
    },
  ];

  for (const section of sections) {
    await prisma.schoolSection.upsert({
      where: { code: section.code },
      update: {
        name: section.name,
        rankingMethod: section.rankingMethod,
        classesDescription: section.classesDescription,
      },
      create: section,
    });
  }

  console.log('✓  School sections seeded (2: Lower Primary, Upper Primary)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ASSESSMENT TYPES
// ─────────────────────────────────────────────────────────────────────────────
async function seedAssessmentTypes() {
  const types = [
    {
      code: 'BOT',
      label: 'Beginning of Term',
      appearsOnReportCard: true,
      contributesToAggregate: false,
      isSystemDefault: true,
      isActive: true,
      displayOrder: 1,
    },
    {
      code: 'MOT',
      label: 'Middle of Term',
      appearsOnReportCard: true,
      contributesToAggregate: false,
      isSystemDefault: true,
      isActive: true,
      displayOrder: 2,
    },
    {
      code: 'EOT',
      label: 'End of Term',
      appearsOnReportCard: true,
      contributesToAggregate: true,
      isSystemDefault: true,
      isActive: true,
      displayOrder: 3,
    },
  ];

  for (const type of types) {
    await prisma.assessmentTypeConfig.upsert({
      where: { code: type.code },
      update: {
        label: type.label,
        appearsOnReportCard: type.appearsOnReportCard,
        contributesToAggregate: type.contributesToAggregate,
        isSystemDefault: type.isSystemDefault,
        displayOrder: type.displayOrder,
      },
      create: type,
    });
  }

  console.log('✓  Assessment types seeded (3: BOT, MOT, EOT — only EOT contributes to aggregate)');
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. REPORT CARD SETTINGS (single-row table)
// ─────────────────────────────────────────────────────────────────────────────
async function seedReportCardSettings() {
  const settings = {
    showBotOnReport: true,
    showMotOnReport: true,
    showEotOnReport: true,
    averagePeriods: false,
    showClassRank: true,
    rankingFormat: 'ordinal',
    showGradeGuide: true,
    showSchoolRequirements: true,
    showNextTermDates: true,
    whoCanGenerate: 'dos_admin',
  };

  const existing = await prisma.reportCardSetting.findFirst();

  if (existing) {
    await prisma.reportCardSetting.update({ where: { id: existing.id }, data: settings });
    console.log('✓  Report card settings updated (1 row)');
  } else {
    await prisma.reportCardSetting.create({ data: settings });
    console.log('✓  Report card settings seeded (1 row)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DEFAULT ADMIN USER
// ─────────────────────────────────────────────────────────────────────────────
async function seedAdminUser() {
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'system_admin' } });

  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin@1234', 12);

    await prisma.user.create({
      data: {
        fullName: 'System Administrator',
        username: 'admin',
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        mustChangePassword: true,
      },
    });

    console.log('✓  Admin user seeded (username: admin — must change password on first login)');
  } else {
    console.log('✓  Admin user already exists — skipped (no password change)');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. ACADEMIC YEAR, CLASSES & STREAMS
// ─────────────────────────────────────────────────────────────────────────────
async function seedAcademicStructure() {
  // ── Academic year ───────────────────────────────────────────
  const year = await prisma.academicYear.upsert({
    where:  { yearLabel: '2026' },
    update: { isCurrent: true },
    create: {
      yearLabel: '2026',
      startDate: new Date('2026-02-01'),
      endDate:   new Date('2026-11-30'),
      isCurrent: true,
    },
  });

  // ── School sections (already seeded, just fetch IDs) ────────
  const lower = await prisma.schoolSection.findUniqueOrThrow({ where: { code: 'LOWER' } });
  const upper = await prisma.schoolSection.findUniqueOrThrow({ where: { code: 'UPPER' } });

  // ── Classes ─────────────────────────────────────────────────
  const classDefs = [
    { name: 'Nursery', levelOrder: 0, sectionId: lower.id },
    { name: 'P.1',     levelOrder: 1, sectionId: lower.id },
    { name: 'P.2',     levelOrder: 2, sectionId: lower.id },
    { name: 'P.3',     levelOrder: 3, sectionId: lower.id },
    { name: 'P.4',     levelOrder: 4, sectionId: upper.id },
    { name: 'P.5',     levelOrder: 5, sectionId: upper.id },
    { name: 'P.6',     levelOrder: 6, sectionId: upper.id },
    { name: 'P.7',     levelOrder: 7, sectionId: upper.id },
  ];

  const classes: Record<string, string> = {};
  for (const def of classDefs) {
    // Unique by name within a school section
    const existing = await prisma.class.findFirst({
      where: { name: def.name, schoolSectionId: def.sectionId },
    });
    const cls = existing ?? await prisma.class.create({
      data: { name: def.name, levelOrder: def.levelOrder, schoolSectionId: def.sectionId },
    });
    classes[def.name] = cls.id;
  }

  // ── Streams (one default stream per class for the current year) ─
  const streamDefs = [
    { className: 'Nursery', name: 'Nursery' },
    { className: 'P.1',     name: 'P.1A' },
    { className: 'P.2',     name: 'P.2A' },
    { className: 'P.3',     name: 'P.3A' },
    { className: 'P.4',     name: 'P.4A' },
    { className: 'P.5',     name: 'P.5A' },
    { className: 'P.6',     name: 'P.6A' },
    { className: 'P.7',     name: 'P.7A' },
  ];

  for (const def of streamDefs) {
    const classId = classes[def.className];
    const existing = await prisma.stream.findFirst({
      where: { classId, academicYearId: year.id, name: def.name },
    });
    if (!existing) {
      await prisma.stream.create({
        data: { classId, name: def.name, academicYearId: year.id },
      });
    }
  }

  console.log('✓  Academic year 2026 seeded (current)');
  console.log('✓  8 classes seeded (Nursery + P.1–P.7)');
  console.log('✓  8 default streams seeded (one per class)');
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n── SMS Database Seed ─────────────────────────────────');

  await seedRoles();

  const gradingScaleId = await seedGradingScale();
  await seedDivisionBoundaries(gradingScaleId);

  await seedSchoolSections();
  await seedAssessmentTypes();
  await seedReportCardSettings();
  await seedAdminUser();
  await seedAcademicStructure();

  console.log('─────────────────────────────────────────────────────');
  console.log('  Seed complete.\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
