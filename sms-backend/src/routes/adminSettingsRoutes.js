/**
 * Admin settings routes — /api/v1/admin/settings
 *
 * All routes require authentication + system_admin role.
 */

import { Router } from 'express';
import { body }   from 'express-validator';

import { authenticate }        from '../middleware/auth.js';
import { requireRole }         from '../middleware/rbac.js';
import { logoUpload }          from '../integrations/logo.js';
import * as AdminSettings      from '../controllers/AdminSettingsController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('system_admin'));

// ── Validation ────────────────────────────────────────────────

const profileValidation = [
  body('schoolName').optional().trim().isLength({ max: 200 }).withMessage('Max 200 chars'),
  body('schoolMotto').optional().trim().isLength({ max: 200 }),
  body('addressLine1').optional().trim().isLength({ max: 200 }),
  body('addressLine2').optional().trim().isLength({ max: 200 }),
  body('primaryPhone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('secondaryPhone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email'),
  body('website').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('mobileMoneyMtn').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('mobileMoneyAirtel').optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
  body('mobileMoneyAccountName').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('invoiceFineAfterDueDate').optional({ checkFalsy: true })
    .isInt({ min: 0 }).withMessage('Must be a non-negative integer (UGX)'),
];

// ── Routes ────────────────────────────────────────────────────

// GET /api/v1/admin/settings/profile
router.get('/profile', AdminSettings.getProfile);

// PUT /api/v1/admin/settings/profile  (multipart/form-data, optional logo file)
router.put(
  '/profile',
  logoUpload.single('logo'),
  profileValidation,
  AdminSettings.updateProfile,
);

export default router;
