/**
 * AuthController — thin HTTP layer for auth endpoints.
 *
 * Each method extracts request data, delegates to AuthService,
 * and formats the response. No business logic lives here.
 */

import { validationResult } from 'express-validator';
import * as AuthService from '../services/AuthService.js';
import { REFRESH_TOKEN_TTL_SECONDS } from '../utils/tokens.js';

// Cookie name used across all auth endpoints
const REFRESH_COOKIE = 'refreshToken';

/** Shared cookie options for the refresh-token HTTP-only cookie. */
function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   REFRESH_TOKEN_TTL_SECONDS * 1000, // ms
  };
}

// ── POST /api/v1/auth/login ───────────────────────────────────

export async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.headers['user-agent'];

  const result = await AuthService.login({ username, password, ipAddress, userAgent });

  res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());

  return res.status(200).json({
    accessToken: result.accessToken,
    user:        result.user,
  });
}

// ── POST /api/v1/auth/refresh ─────────────────────────────────

export async function refresh(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const ipAddress    = req.ip;

  const result = await AuthService.refresh({ refreshToken, ipAddress });

  return res.status(200).json({ accessToken: result.accessToken });
}

// ── POST /api/v1/auth/logout ──────────────────────────────────

export async function logout(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  const userId       = req.user?.id;   // may be undefined if called without auth
  const ipAddress    = req.ip;

  await AuthService.logout({ refreshToken, userId, ipAddress });

  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());

  return res.status(200).json({ message: 'Logged out successfully' });
}

// ── POST /api/v1/auth/change-password ────────────────────────

export async function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  const userId    = req.user.id;
  const ipAddress = req.ip;

  await AuthService.changePassword({ userId, currentPassword, newPassword, ipAddress });

  // Revocation of other sessions happens inside AuthService.
  // Clear the current device's refresh cookie so a fresh login is required.
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());

  return res.status(200).json({ message: 'Password changed. Please log in again.' });
}
