/**
 * User management routes — /api/v1/admin/users
 *
 * All routes: authentication + system_admin role required.
 */

import { Router }           from 'express';
import { body, param, query } from 'express-validator';
import { authenticate }     from '../middleware/auth.js';
import { requireRole }      from '../middleware/rbac.js';
import * as UserMgmtCtrl    from '../controllers/UserManagementController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('system_admin'));

// ── Validation ────────────────────────────────────────────────

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be 1–100'),
  query('roleId').optional().isUUID().withMessage('roleId must be a valid UUID'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive must be true or false'),
];

const createValidation = [
  body('fullName')
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('fullName is required (max 150 chars)'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('username must be 3–100 characters')
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage('username may only contain letters, numbers, dots, underscores, or hyphens'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('email must be a valid email address')
    .isLength({ max: 200 })
    .withMessage('email max 200 chars'),
  body('roleId')
    .isUUID()
    .withMessage('roleId must be a valid UUID'),
];

const updateValidation = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 150 })
    .withMessage('fullName max 150 chars'),
  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('email must be a valid email address')
    .isLength({ max: 200 })
    .withMessage('email max 200 chars'),
  body('roleId')
    .optional()
    .isUUID()
    .withMessage('roleId must be a valid UUID'),
];

const idParam = [
  param('id').isUUID().withMessage('Invalid user ID'),
];

// ── Routes ────────────────────────────────────────────────────

// GET  /api/v1/admin/users
router.get('/', listValidation, UserMgmtCtrl.listUsers);

// POST /api/v1/admin/users
router.post('/', createValidation, UserMgmtCtrl.createUser);

// PUT  /api/v1/admin/users/:id
router.put('/:id', updateValidation, UserMgmtCtrl.updateUser);

// POST /api/v1/admin/users/:id/deactivate
router.post('/:id/deactivate', idParam, UserMgmtCtrl.deactivateUser);

// POST /api/v1/admin/users/:id/reactivate
router.post('/:id/reactivate', idParam, UserMgmtCtrl.reactivateUser);

// POST /api/v1/admin/users/:id/reset-password
router.post('/:id/reset-password', idParam, UserMgmtCtrl.resetPassword);

export default router;
