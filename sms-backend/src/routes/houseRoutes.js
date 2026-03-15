/**
 * House routes — /api/v1/admin/houses
 *
 * All routes require authentication + system_admin role.
 */

import { Router } from 'express';
import { body, param } from 'express-validator';

import { authenticate }  from '../middleware/auth.js';
import { requireRole }   from '../middleware/rbac.js';
import * as HouseCtrl    from '../controllers/HouseController.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('system_admin'));

// ── Validation ────────────────────────────────────────────────

const nameAndColour = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Name is required (max 80 chars)'),
  body('colourHex')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^#[0-9A-Fa-f]{3,8}$/)
    .withMessage('colourHex must be a valid hex colour, e.g. #F59E0B'),
];

const updateValidation = [
  param('id').isUUID().withMessage('Invalid house ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Name max 80 chars'),
  body('colourHex')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^#[0-9A-Fa-f]{3,8}$/)
    .withMessage('colourHex must be a valid hex colour, e.g. #F59E0B'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// ── Routes ────────────────────────────────────────────────────

// GET /api/v1/admin/houses
router.get('/', HouseCtrl.listHouses);

// GET /api/v1/admin/houses/active  — dropdown endpoint (no auth check needed beyond login)
router.get('/active', HouseCtrl.listActiveHouses);

// POST /api/v1/admin/houses
router.post('/', nameAndColour, HouseCtrl.createHouse);

// PUT /api/v1/admin/houses/:id
router.put('/:id', updateValidation, HouseCtrl.updateHouse);

// DELETE /api/v1/admin/houses/:id
router.delete('/:id', param('id').isUUID(), HouseCtrl.deleteHouse);

export default router;
