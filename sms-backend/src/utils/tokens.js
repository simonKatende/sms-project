/**
 * JWT and token utility helpers.
 *
 * Access token  — short-lived JWT (15 min). Carried as Bearer in Authorization header.
 * Refresh token — opaque random hex string (64 chars). Stored as HTTP-only cookie.
 *                 Only a SHA-256 hash of the token is persisted in the sessions table.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_TTL     = '15m';
const REFRESH_TOKEN_TTL_S  = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Access token ─────────────────────────────────────────────

/**
 * Sign an access token for the given user.
 * @param {{ id: string, roleId: string, roleName: string }} user
 * @returns {string} signed JWT
 */
export function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, roleId: user.roleId, roleName: user.roleName },
    ACCESS_TOKEN_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

/**
 * Verify an access token.
 * Throws if the token is invalid or expired.
 * @param {string} token
 * @returns {{ sub: string, roleId: string, roleName: string }} decoded payload
 */
export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

// ── Refresh token ─────────────────────────────────────────────

/**
 * Generate a cryptographically-random opaque refresh token.
 * @returns {string} 64-char hex string
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Derive the SHA-256 hash of a token for safe DB storage.
 * Using a fast hash here is intentional — we need O(1) indexed lookup;
 * bcrypt is reserved for passwords, not tokens.
 * @param {string} token
 * @returns {string} hex digest
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Refresh token expiry in seconds (for cookie maxAge and DB record). */
export const REFRESH_TOKEN_TTL_SECONDS = REFRESH_TOKEN_TTL_S;
