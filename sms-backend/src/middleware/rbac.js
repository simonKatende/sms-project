/**
 * Role-Based Access Control (RBAC) middleware.
 *
 * Two layers:
 *   1. requireRole(...roles)         — coarse-grained: checks req.user.roleName
 *   2. requirePermission(permission) — fine-grained: queries user_roles table
 *
 * Both middleware require authenticate() to have run first.
 *
 * Usage:
 *   router.post('/pupils', authenticate, requireRole('system_admin', 'bursar'), handler)
 *   router.delete('/pupils/:id', authenticate, requirePermission('pupils:delete'), handler)
 */

import { prisma } from '../lib/prisma.js';

/**
 * Require the authenticated user to have one of the specified role names.
 *
 * @param {...string} roles — allowed role name values (e.g. 'system_admin', 'bursar')
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.roleName)) {
      return res.status(403).json({
        error: 'Forbidden',
        detail: `Requires one of: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Require the authenticated user's role to have a specific permission entry
 * in the user_roles table.
 *
 * system_admin bypasses this check — they have unrestricted access.
 *
 * @param {string} permission — permission string (e.g. 'pupils:delete')
 * @returns {import('express').RequestHandler}
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // system_admin is always permitted
    if (req.user.roleName === 'system_admin') {
      return next();
    }

    const record = await prisma.userRole.findFirst({
      where: {
        roleId:     req.user.roleId,
        permission: permission,
      },
    });

    if (!record) {
      return res.status(403).json({
        error:  'Forbidden',
        detail: `Missing permission: ${permission}`,
      });
    }

    next();
  };
}
