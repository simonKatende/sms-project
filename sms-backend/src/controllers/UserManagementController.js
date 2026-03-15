/**
 * UserManagementController — HTTP layer for /api/v1/admin/users.
 *
 * All routes: system_admin only (enforced in router).
 * Delegates all business logic to UserManagementService.
 */

import { validationResult } from 'express-validator';
import * as UserManagementService from '../services/UserManagementService.js';

/**
 * GET /api/v1/admin/users
 * Query: roleId, isActive, search, page, pageSize
 */
export async function listUsers(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { roleId, search, page, pageSize } = req.query;
    const isActive = req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined;

    const result = await UserManagementService.listUsers({
      roleId,
      isActive,
      search,
      page:     page     ? parseInt(page, 10)     : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
    });

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/users
 * Body: { fullName, username, email?, roleId }
 * Returns: { user, tempPassword }
 */
export async function createUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { fullName, username, email, roleId } = req.body;
    const result = await UserManagementService.createUser({ fullName, username, email, roleId });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/admin/users/:id
 * Body: { fullName?, email?, roleId? }
 */
export async function updateUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { id }                              = req.params;
    const { fullName, email, roleId }         = req.body;
    const { id: requestingUserId, roleName: requestingRoleName } = req.user;

    const user = await UserManagementService.updateUser(
      id,
      { fullName, email, roleId },
      { requestingUserId, requestingRoleName },
    );

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/users/:id/deactivate
 */
export async function deactivateUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { id }           = req.params;
    const requestingUserId = req.user.id;

    const user = await UserManagementService.deactivateUser(id, requestingUserId);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/users/:id/reactivate
 */
export async function reactivateUser(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const user   = await UserManagementService.reactivateUser(id);
    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/users/:id/reset-password
 * Returns: { user, tempPassword }
 */
export async function resetPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const result = await UserManagementService.resetPassword(id);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
