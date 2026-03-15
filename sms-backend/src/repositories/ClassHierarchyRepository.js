/**
 * ClassHierarchyRepository — DB queries for class groups, sub-groups, and the hierarchy tree.
 */

import { prisma } from '../lib/prisma.js';

// ── Shared includes ────────────────────────────────────────────

const GROUP_INCLUDE = {
  _count: { select: { classSubGroups: true } },
};

const SUB_GROUP_INCLUDE = {
  classGroup: { select: { id: true, name: true } },
  _count:     { select: { classes: true } },
};

// ── Class groups ───────────────────────────────────────────────

/**
 * Return all class groups ordered by displayOrder.
 * @returns {Promise<Array>}
 */
export async function findAllClassGroups() {
  return prisma.classGroup.findMany({
    include: GROUP_INCLUDE,
    orderBy: { displayOrder: 'asc' },
  });
}

/**
 * Find a class group by primary key.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findClassGroupById(id) {
  return prisma.classGroup.findUnique({ where: { id }, include: GROUP_INCLUDE });
}

/**
 * Find a class group by its unique name.
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function findClassGroupByName(name) {
  return prisma.classGroup.findUnique({ where: { name } });
}

/**
 * Create a class group.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createClassGroup(data) {
  return prisma.classGroup.create({ data, include: GROUP_INCLUDE });
}

/**
 * Update a class group by id.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateClassGroup(id, data) {
  return prisma.classGroup.update({ where: { id }, data, include: GROUP_INCLUDE });
}

/**
 * Hard-delete a class group by id.
 * @param {string} id
 */
export async function deleteClassGroup(id) {
  return prisma.classGroup.delete({ where: { id } });
}

// ── Class sub-groups ───────────────────────────────────────────

/**
 * Return class sub-groups, optionally filtered by classGroupId.
 * @param {object} [opts]
 * @param {string} [opts.classGroupId]
 * @returns {Promise<Array>}
 */
export async function findClassSubGroups({ classGroupId } = {}) {
  return prisma.classSubGroup.findMany({
    where:   classGroupId ? { classGroupId } : undefined,
    include: SUB_GROUP_INCLUDE,
    orderBy: [{ classGroup: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
  });
}

/**
 * Find a class sub-group by primary key.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function findClassSubGroupById(id) {
  return prisma.classSubGroup.findUnique({ where: { id }, include: SUB_GROUP_INCLUDE });
}

/**
 * Find a sub-group by the composite unique key (classGroupId, name).
 * @param {string} classGroupId
 * @param {string} name
 * @returns {Promise<object|null>}
 */
export async function findClassSubGroupByGroupAndName(classGroupId, name) {
  return prisma.classSubGroup.findUnique({
    where: { classGroupId_name: { classGroupId, name } },
  });
}

/**
 * Create a class sub-group.
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createClassSubGroup(data) {
  return prisma.classSubGroup.create({ data, include: SUB_GROUP_INCLUDE });
}

/**
 * Update a class sub-group by id.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateClassSubGroup(id, data) {
  return prisma.classSubGroup.update({ where: { id }, data, include: SUB_GROUP_INCLUDE });
}

/**
 * Hard-delete a class sub-group by id.
 * @param {string} id
 */
export async function deleteClassSubGroup(id) {
  return prisma.classSubGroup.delete({ where: { id } });
}

// ── Hierarchy tree ─────────────────────────────────────────────

/**
 * Fetch the full 3-level hierarchy in a single query.
 * Only active groups, active sub-groups, and active classes are included.
 * @returns {Promise<Array>}  Raw Prisma result (groups with nested sub-groups and classes).
 */
export async function findHierarchyTree() {
  return prisma.classGroup.findMany({
    where:   { isActive: true },
    orderBy: { displayOrder: 'asc' },
    include: {
      classSubGroups: {
        where:   { isActive: true },
        orderBy: { displayOrder: 'asc' },
        include: {
          classes: {
            where:   { isActive: true },
            orderBy: { levelOrder: 'asc' },
            include: {
              schoolSection: {
                select: { id: true, name: true, code: true, rankingMethod: true },
              },
            },
          },
        },
      },
    },
  });
}
