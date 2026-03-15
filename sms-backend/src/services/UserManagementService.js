/**
 * UserManagementService — CRUD for user accounts.
 *
 * Responsibilities:
 *   listUsers()       — paginated list with filters
 *   createUser()      — create account with auto-generated temp password
 *   updateUser()      — update profile (username immutable; cannot change own roleId)
 *   deactivateUser()  — soft-disable + revoke all sessions
 *   reactivateUser()  — re-enable account
 *   resetPassword()   — generate new temp password, invalidate sessions
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

// ── Internal helpers ──────────────────────────────────────────

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate an 8-character random alphanumeric temporary password.
 * @returns {string}
 */
function generateTempPassword() {
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes)
    .map(b => ALPHANUMERIC[b % ALPHANUMERIC.length])
    .join('');
}

/** Fields returned in list and detail responses (no password hash). */
const USER_SELECT = {
  id:                true,
  fullName:          true,
  username:          true,
  email:             true,
  isActive:          true,
  mustChangePassword: true,
  lastLoginAt:       true,
  createdAt:         true,
  updatedAt:         true,
  role: {
    select: { id: true, name: true, displayName: true },
  },
};

// ── Public methods ────────────────────────────────────────────

/**
 * Return a paginated list of users.
 *
 * @param {{ roleId?: string, isActive?: boolean, search?: string, page?: number, pageSize?: number }}
 * @returns {{ data: object[], total: number, page: number, pageSize: number, totalPages: number }}
 */
export async function listUsers({ roleId, isActive, search, page = 1, pageSize = 20 } = {}) {
  const where = {
    deletedAt: null,
    ...(roleId !== undefined && { roleId }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select:  USER_SELECT,
      orderBy: { fullName: 'asc' },
      skip,
      take:    pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create a new user account with a randomly generated temporary password.
 *
 * @param {{ fullName: string, username: string, email?: string, roleId: string }}
 * @returns {{ user: object, tempPassword: string }}
 * @throws {{ status: 409 }} if username or email already exists
 * @throws {{ status: 404 }} if roleId does not exist
 */
export async function createUser({ fullName, username, email, roleId }) {
  // 1. Validate uniqueness
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    throw Object.assign(new Error('Username is already taken'), { status: 409 });
  }

  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    if (existingEmail) {
      throw Object.assign(new Error('Email address is already in use'), { status: 409 });
    }
  }

  // 2. Validate role exists
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw Object.assign(new Error('Role not found'), { status: 404 });
  }

  // 3. Generate temp password and hash
  const tempPassword  = generateTempPassword();
  const passwordHash  = await bcrypt.hash(tempPassword, 12);

  // 4. Create user
  const user = await prisma.user.create({
    data: {
      fullName,
      username,
      email:             email ?? null,
      passwordHash,
      roleId,
      isActive:          true,
      mustChangePassword: true,
    },
    select: USER_SELECT,
  });

  return { user, tempPassword };
}

/**
 * Update a user's profile. Username is immutable.
 * A system_admin cannot change their own roleId.
 *
 * @param {string} id — target user UUID
 * @param {{ fullName?: string, email?: string, roleId?: string }} data
 * @param {{ requestingUserId: string, requestingRoleName: string }} caller
 * @returns {object} updated user
 * @throws {{ status: 400 }} if system_admin tries to change own roleId
 * @throws {{ status: 404 }} if user not found
 * @throws {{ status: 409 }} if email already in use by another user
 */
export async function updateUser(id, { fullName, email, roleId }, { requestingUserId, requestingRoleName }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  // system_admin cannot demote themselves
  if (requestingUserId === id && roleId !== undefined && roleId !== user.roleId) {
    if (requestingRoleName === 'system_admin') {
      throw Object.assign(new Error('You cannot change your own role'), { status: 400 });
    }
  }

  // Email uniqueness check (if changing email)
  if (email !== undefined && email !== user.email) {
    const conflict = await prisma.user.findFirst({
      where: { email, deletedAt: null, NOT: { id } },
    });
    if (conflict) {
      throw Object.assign(new Error('Email address is already in use'), { status: 409 });
    }
  }

  // Validate new roleId if provided
  if (roleId !== undefined && roleId !== user.roleId) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw Object.assign(new Error('Role not found'), { status: 404 });
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(fullName !== undefined && { fullName }),
      ...(email    !== undefined && { email }),
      ...(roleId   !== undefined && { roleId }),
    },
    select: USER_SELECT,
  });
}

/**
 * Deactivate a user account and revoke all their active sessions.
 *
 * @param {string} id — target user UUID
 * @param {string} requestingUserId — UUID of the admin performing the action
 * @returns {object} updated user
 * @throws {{ status: 400 }} if trying to deactivate yourself
 * @throws {{ status: 404 }} if user not found
 */
export async function deactivateUser(id, requestingUserId) {
  if (id === requestingUserId) {
    throw Object.assign(new Error('You cannot deactivate your own account'), { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data:  { isActive: false },
      select: USER_SELECT,
    }),
    prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data:  { revokedAt: new Date() },
    }),
  ]);

  return updatedUser;
}

/**
 * Reactivate a previously deactivated user account.
 *
 * @param {string} id — target user UUID
 * @returns {object} updated user
 * @throws {{ status: 404 }} if user not found
 */
export async function reactivateUser(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  return prisma.user.update({
    where: { id },
    data:  { isActive: true },
    select: USER_SELECT,
  });
}

/**
 * Reset a user's password to a new auto-generated temporary password.
 * Sets mustChangePassword = true and revokes all active sessions.
 *
 * @param {string} id — target user UUID
 * @returns {{ user: object, tempPassword: string }}
 * @throws {{ status: 404 }} if user not found
 */
export async function resetPassword(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data:  { passwordHash, mustChangePassword: true },
      select: USER_SELECT,
    }),
    prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data:  { revokedAt: new Date() },
    }),
  ]);

  return { user: updatedUser, tempPassword };
}
