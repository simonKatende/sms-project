/**
 * ClassHierarchyController — thin HTTP adapter for ClassHierarchyService.
 */

import { validationResult } from 'express-validator';
import * as HierarchyService from '../services/ClassHierarchyService.js';

// ── Class groups ───────────────────────────────────────────────

// GET /api/v1/admin/class-groups
export async function listClassGroups(req, res, next) {
  try {
    const groups = await HierarchyService.listClassGroups();
    res.json({ data: groups });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/class-groups
export async function createClassGroup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const group = await HierarchyService.createClassGroup({
      name:         req.body.name,
      displayOrder: req.body.displayOrder,
      isActive:     req.body.isActive ?? true,
    });
    res.status(201).json({ data: group });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/class-groups/:id
export async function updateClassGroup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const group = await HierarchyService.updateClassGroup(req.params.id, {
      name:         req.body.name,
      displayOrder: req.body.displayOrder,
      isActive:     req.body.isActive,
    });
    res.json({ data: group });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/admin/class-groups/:id
export async function deleteClassGroup(req, res, next) {
  try {
    await HierarchyService.deleteClassGroup(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ── Class sub-groups ───────────────────────────────────────────

// GET /api/v1/admin/class-sub-groups[?classGroupId=X]
export async function listClassSubGroups(req, res, next) {
  try {
    const subGroups = await HierarchyService.listClassSubGroups({
      classGroupId: req.query.classGroupId,
    });
    res.json({ data: subGroups });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/admin/class-sub-groups
export async function createClassSubGroup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const subGroup = await HierarchyService.createClassSubGroup({
      classGroupId: req.body.classGroupId,
      name:         req.body.name,
      displayOrder: req.body.displayOrder,
      isActive:     req.body.isActive ?? true,
    });
    res.status(201).json({ data: subGroup });
  } catch (err) {
    next(err);
  }
}

// PUT /api/v1/admin/class-sub-groups/:id
export async function updateClassSubGroup(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const subGroup = await HierarchyService.updateClassSubGroup(req.params.id, {
      name:         req.body.name,
      displayOrder: req.body.displayOrder,
      isActive:     req.body.isActive,
    });
    res.json({ data: subGroup });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/admin/class-sub-groups/:id
export async function deleteClassSubGroup(req, res, next) {
  try {
    await HierarchyService.deleteClassSubGroup(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

// ── Hierarchy tree ─────────────────────────────────────────────

// GET /api/v1/admin/class-hierarchy
export async function getClassHierarchy(req, res, next) {
  try {
    const tree = await HierarchyService.buildClassHierarchy();
    res.json({ data: tree });
  } catch (err) {
    next(err);
  }
}
