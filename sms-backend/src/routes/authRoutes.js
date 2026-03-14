/**
 * Auth routes — /api/v1/auth/*
 *
 * Rate limiting:
 *   POST /login — max 5 failures per IP per 15 minutes (express-rate-limit).
 *   All other auth endpoints are not rate-limited here (downstream services
 *   apply their own guards, e.g. session validation).
 *
 * Validation:
 *   express-validator rules are defined inline and checked in the controller.
 */

import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { body } from 'express-validator';
import cookieParser from 'cookie-parser';

import { authenticate } from '../middleware/auth.js';
import * as AuthController from '../controllers/AuthController.js';

const router = Router();

// Cookie parser — needed to read the refreshToken HTTP-only cookie
router.use(cookieParser());

// ── Rate limiter for login ────────────────────────────────────
const loginRateLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              5,
  standardHeaders:  'draft-7',
  legacyHeaders:    false,
  skipSuccessfulRequests: true,      // only count failed attempts
  message: {
    error: 'Too many failed login attempts. Please try again in 15 minutes.',
  },
});

// ── Validation rules ──────────────────────────────────────────
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
];

// ── Routes ────────────────────────────────────────────────────

// POST /api/v1/auth/login
router.post('/login', loginRateLimiter, loginValidation, AuthController.login);

// POST /api/v1/auth/refresh  (no auth middleware — refresh token is in the cookie)
router.post('/refresh', AuthController.refresh);

// POST /api/v1/auth/logout  (attempt to authenticate but don't fail if token expired)
router.post('/logout', AuthController.logout);

// POST /api/v1/auth/change-password  (must be logged in)
router.post('/change-password', authenticate, changePasswordValidation, AuthController.changePassword);

export default router;
