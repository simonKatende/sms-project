/**
 * AuthService — all authentication business logic.
 *
 * Responsibilities:
 *   login()          — validate credentials, create session, write audit log
 *   refresh()        — validate refresh token cookie, issue new access token
 *   logout()         — revoke session, clear state
 *   changePassword() — verify current password, update hash, clear must_change_password
 */

import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../utils/tokens.js';

// ── Internal helpers ──────────────────────────────────────────

/**
 * Write a row to audit_logs.
 * Non-fatal — logs the error but does not throw if the write fails.
 */
async function writeAudit({ userId, action, entityType, entityId, ipAddress, notes }) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId: entityId ?? undefined, ipAddress, notes },
    });
  } catch (err) {
    console.error('[AuditService] Failed to write audit log:', err.message);
  }
}

// ── Public methods ────────────────────────────────────────────

/**
 * Validate username/password, issue tokens, create session.
 *
 * @param {{ username: string, password: string, ipAddress?: string, userAgent?: string }}
 * @returns {{ accessToken: string, refreshToken: string, user: object }}
 * @throws {{ status: number, message: string }}
 */
export async function login({ username, password, ipAddress, userAgent }) {
  // 1. Look up the user (include role name for JWT payload)
  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: { select: { name: true } } },
  });

  if (!user || user.deletedAt) {
    throw Object.assign(new Error('Invalid username or password'), { status: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is disabled'), { status: 403 });
  }

  // 2. Compare password
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    await writeAudit({
      userId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'users',
      entityId: user.id,
      ipAddress,
      notes: 'Incorrect password',
    });
    throw Object.assign(new Error('Invalid username or password'), { status: 401 });
  }

  // 3. Generate tokens
  const accessToken  = generateAccessToken({ id: user.id, roleId: user.roleId, roleName: user.role.name });
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  // 4. Persist session
  await prisma.session.create({
    data: {
      userId:           user.id,
      refreshTokenHash: tokenHash,
      ipAddress:        ipAddress ?? null,
      userAgent:        userAgent ?? null,
      expiresAt,
    },
  });

  // 5. Update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data:  { lastLoginAt: new Date() },
  });

  // 6. Audit
  await writeAudit({
    userId:     user.id,
    action:     'LOGIN',
    entityType: 'users',
    entityId:   user.id,
    ipAddress,
    notes:      'Successful login',
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id:                user.id,
      fullName:          user.fullName,
      username:          user.username,
      roleName:          user.role.name,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

/**
 * Issue a new access token given a valid refresh token.
 *
 * @param {{ refreshToken: string, ipAddress?: string }}
 * @returns {{ accessToken: string }}
 * @throws {{ status: number, message: string }}
 */
export async function refresh({ refreshToken, ipAddress }) {
  if (!refreshToken) {
    throw Object.assign(new Error('Refresh token required'), { status: 401 });
  }

  const tokenHash = hashToken(refreshToken);

  const session = await prisma.session.findUnique({
    where:   { refreshTokenHash: tokenHash },
    include: { user: { include: { role: { select: { name: true } } } } },
  });

  if (!session) {
    throw Object.assign(new Error('Invalid session'), { status: 401 });
  }

  if (session.revokedAt) {
    // Possible token reuse — revoke all sessions for this user as a precaution
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    });
    await writeAudit({
      userId:     session.userId,
      action:     'REFRESH_TOKEN_REUSE',
      entityType: 'sessions',
      entityId:   session.id,
      ipAddress,
      notes:      'Revoked token reuse detected — all sessions invalidated',
    });
    throw Object.assign(new Error('Session revoked'), { status: 401 });
  }

  if (session.expiresAt < new Date()) {
    throw Object.assign(new Error('Session expired'), { status: 401 });
  }

  if (!session.user.isActive || session.user.deletedAt) {
    throw Object.assign(new Error('Account is disabled'), { status: 403 });
  }

  const accessToken = generateAccessToken({
    id:       session.user.id,
    roleId:   session.user.roleId,
    roleName: session.user.role.name,
  });

  return { accessToken };
}

/**
 * Revoke the session that owns the given refresh token.
 *
 * @param {{ refreshToken: string, userId: string, ipAddress?: string }}
 */
export async function logout({ refreshToken, userId, ipAddress }) {
  if (!refreshToken) return; // nothing to revoke — cookie already gone

  const tokenHash = hashToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: tokenHash },
  });

  if (session && !session.revokedAt) {
    await prisma.session.update({
      where: { id: session.id },
      data:  { revokedAt: new Date() },
    });
  }

  await writeAudit({
    userId,
    action:     'LOGOUT',
    entityType: 'sessions',
    entityId:   session?.id ?? undefined,
    ipAddress,
    notes:      'User logged out',
  });
}

/**
 * Change a user's own password.
 *
 * @param {{ userId: string, currentPassword: string, newPassword: string, ipAddress?: string }}
 * @throws {{ status: number, message: string }}
 */
export async function changePassword({ userId, currentPassword, newPassword, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.deletedAt) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw Object.assign(new Error('Current password is incorrect'), { status: 400 });
  }

  if (newPassword.length < 8) {
    throw Object.assign(new Error('New password must be at least 8 characters'), { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data:  { passwordHash: newHash, mustChangePassword: false },
  });

  // Revoke all other sessions so re-login is required on other devices
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data:  { revokedAt: new Date() },
  });

  await writeAudit({
    userId,
    action:     'PASSWORD_CHANGED',
    entityType: 'users',
    entityId:   userId,
    ipAddress,
    notes:      'Password changed by user',
  });
}
