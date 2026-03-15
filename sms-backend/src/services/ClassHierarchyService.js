/**
 * ClassHierarchyService — business logic for the 3-level class hierarchy.
 *
 * Business rules:
 *  - ClassGroup.name must be globally unique.
 *  - (ClassSubGroup.classGroupId, ClassSubGroup.name) must be unique.
 *  - Cannot delete a ClassGroup that still has ClassSubGroups linked — 409.
 *  - Cannot delete a ClassSubGroup that still has Classes linked — 409.
 */

import * as Repo from '../repositories/ClassHierarchyRepository.js';

// ── Class groups ───────────────────────────────────────────────

/**
 * List all class groups ordered by displayOrder.
 * @returns {Promise<Array>}
 */
export async function listClassGroups() {
  return Repo.findAllClassGroups();
}

/**
 * Create a new class group.
 *
 * @param {object} fields
 * @param {string}  fields.name
 * @param {number}  fields.displayOrder
 * @param {boolean} [fields.isActive=true]
 * @returns {Promise<object>}
 */
export async function createClassGroup({ name, displayOrder, isActive = true }) {
  const conflict = await Repo.findClassGroupByName(name);
  if (conflict) {
    throw Object.assign(
      new Error(`Class group '${name}' already exists`),
      { status: 409 },
    );
  }
  return Repo.createClassGroup({ name, displayOrder, isActive });
}

/**
 * Update a class group.
 *
 * @param {string} id
 * @param {object} fields — all optional
 * @returns {Promise<object>}
 */
export async function updateClassGroup(id, { name, displayOrder, isActive }) {
  const existing = await Repo.findClassGroupById(id);
  if (!existing) {
    throw Object.assign(new Error('Class group not found'), { status: 404 });
  }

  if (name !== undefined && name !== existing.name) {
    const conflict = await Repo.findClassGroupByName(name);
    if (conflict) {
      throw Object.assign(
        new Error(`Class group '${name}' already exists`),
        { status: 409 },
      );
    }
  }

  const data = {};
  if (name         !== undefined) data.name         = name;
  if (displayOrder !== undefined) data.displayOrder = displayOrder;
  if (isActive     !== undefined) data.isActive     = isActive;

  return Repo.updateClassGroup(id, data);
}

/**
 * Delete a class group.
 * Blocked if any sub-groups are still linked to it.
 *
 * @param {string} id
 */
export async function deleteClassGroup(id) {
  const existing = await Repo.findClassGroupById(id);
  if (!existing) {
    throw Object.assign(new Error('Class group not found'), { status: 404 });
  }
  if (existing._count.classSubGroups > 0) {
    throw Object.assign(
      new Error(
        `Cannot delete: ${existing._count.classSubGroups} sub-group(s) are linked to this group. Remove them first.`,
      ),
      { status: 409 },
    );
  }
  await Repo.deleteClassGroup(id);
}

// ── Class sub-groups ───────────────────────────────────────────

/**
 * List class sub-groups, optionally filtered by classGroupId.
 *
 * @param {object} [opts]
 * @param {string} [opts.classGroupId]
 * @returns {Promise<Array>}
 */
export async function listClassSubGroups({ classGroupId } = {}) {
  return Repo.findClassSubGroups({ classGroupId });
}

/**
 * Create a class sub-group.
 *
 * @param {object} fields
 * @param {string}  fields.classGroupId
 * @param {string}  fields.name
 * @param {number}  fields.displayOrder
 * @param {boolean} [fields.isActive=true]
 * @returns {Promise<object>}
 */
export async function createClassSubGroup({ classGroupId, name, displayOrder, isActive = true }) {
  const group = await Repo.findClassGroupById(classGroupId);
  if (!group) {
    throw Object.assign(new Error('Class group not found'), { status: 404 });
  }

  const conflict = await Repo.findClassSubGroupByGroupAndName(classGroupId, name);
  if (conflict) {
    throw Object.assign(
      new Error(`Sub-group '${name}' already exists in this class group`),
      { status: 409 },
    );
  }

  return Repo.createClassSubGroup({ classGroupId, name, displayOrder, isActive });
}

/**
 * Update a class sub-group.
 *
 * @param {string} id
 * @param {object} fields — all optional
 * @returns {Promise<object>}
 */
export async function updateClassSubGroup(id, { name, displayOrder, isActive }) {
  const existing = await Repo.findClassSubGroupById(id);
  if (!existing) {
    throw Object.assign(new Error('Class sub-group not found'), { status: 404 });
  }

  if (name !== undefined && name !== existing.name) {
    const conflict = await Repo.findClassSubGroupByGroupAndName(existing.classGroupId, name);
    if (conflict) {
      throw Object.assign(
        new Error(`Sub-group '${name}' already exists in this class group`),
        { status: 409 },
      );
    }
  }

  const data = {};
  if (name         !== undefined) data.name         = name;
  if (displayOrder !== undefined) data.displayOrder = displayOrder;
  if (isActive     !== undefined) data.isActive     = isActive;

  return Repo.updateClassSubGroup(id, data);
}

/**
 * Delete a class sub-group.
 * Blocked if any classes are still linked to it.
 *
 * @param {string} id
 */
export async function deleteClassSubGroup(id) {
  const existing = await Repo.findClassSubGroupById(id);
  if (!existing) {
    throw Object.assign(new Error('Class sub-group not found'), { status: 404 });
  }
  if (existing._count.classes > 0) {
    throw Object.assign(
      new Error(
        `Cannot delete: ${existing._count.classes} class(es) are linked to this sub-group. Reassign or remove them first.`,
      ),
      { status: 409 },
    );
  }
  await Repo.deleteClassSubGroup(id);
}

// ── Hierarchy tree ─────────────────────────────────────────────

/**
 * Build the full 3-level hierarchy for dropdown use across the system.
 * Only active groups, sub-groups, and classes are included.
 *
 * @returns {Promise<Array>} Nested structure: group → subGroups[] → classes[]
 */
export async function buildClassHierarchy() {
  const groups = await Repo.findHierarchyTree();

  return groups.map((group) => ({
    group: {
      id:           group.id,
      name:         group.name,
      displayOrder: group.displayOrder,
    },
    subGroups: group.classSubGroups.map((sg) => ({
      subGroup: {
        id:           sg.id,
        name:         sg.name,
        displayOrder: sg.displayOrder,
      },
      classes: sg.classes.map((cls) => ({
        id:            cls.id,
        name:          cls.name,
        levelOrder:    cls.levelOrder,
        isActive:      cls.isActive,
        schoolSection: cls.schoolSection,
      })),
    })),
  }));
}
