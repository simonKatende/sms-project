/**
 * JWT authentication middleware.
 *
 * Reads the Bearer token from the Authorization header, verifies it, and
 * attaches the decoded payload to req.user so downstream handlers can read:
 *   req.user.id       — user UUID
 *   req.user.roleId   — role UUID
 *   req.user.roleName — role name string (e.g. 'system_admin')
 */

import { verifyAccessToken } from '../utils/tokens.js';

/**
 * Middleware: require a valid access token.
 * Returns 401 if missing or invalid; 403 if expired.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id:       payload.sub,
      roleId:   payload.roleId,
      roleName: payload.roleName,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
