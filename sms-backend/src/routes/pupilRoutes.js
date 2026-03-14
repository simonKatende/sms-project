/**
 * Pupil routes — /api/v1/pupils
 *
 * Route ordering matters: specific paths (export, guardian-check, family/:id)
 * MUST come before the /:id param route to avoid being swallowed as an ID.
 */

import { Router } from 'express';
import { body, query } from 'express-validator';

import { authenticate }  from '../middleware/auth.js';
import { requireRole }   from '../middleware/rbac.js';
import { multerUpload }  from '../integrations/photo.js';
import * as PupilController from '../controllers/PupilController.js';

const router = Router();

router.use(authenticate);

// ── Validation rules ──────────────────────────────────────────

const ugandaPhone = /^\+256[0-9]{9}$/;

const registerValidation = [
  body('firstName').trim().notEmpty().withMessage('firstName is required').isLength({ max: 80 }),
  body('lastName').trim().notEmpty().withMessage('lastName is required').isLength({ max: 80 }),
  body('dateOfBirth').notEmpty().withMessage('dateOfBirth is required')
    .isISO8601().withMessage('dateOfBirth must be a valid date')
    .custom(val => { if (new Date(val) >= new Date()) throw new Error('dateOfBirth must be in the past'); return true; }),
  body('gender').notEmpty().isIn(['Male', 'Female']).withMessage('gender must be Male or Female'),
  body('section').notEmpty().isIn(['Day', 'Boarding']).withMessage('section must be Day or Boarding'),
  body('guardian.fullName').trim().notEmpty().withMessage('guardian.fullName is required'),
  body('guardian.relationship').trim().notEmpty().withMessage('guardian.relationship is required'),
  body('guardian.phoneCall').notEmpty().matches(ugandaPhone).withMessage('guardian.phoneCall must be +256XXXXXXXXX'),
  body('guardian.phoneWhatsapp').optional({ nullable: true, checkFalsy: true }).matches(ugandaPhone).withMessage('guardian.phoneWhatsapp must be +256XXXXXXXXX'),
  body('bursary.schemeName').if((_v, { req }) => req.body.isBursary === true || req.body.isBursary === 'true').notEmpty().withMessage('bursary.schemeName required'),
  body('bursary.standardFeesAtAward').if((_v, { req }) => req.body.isBursary === true || req.body.isBursary === 'true').isInt({ min: 1 }).withMessage('bursary.standardFeesAtAward must be positive'),
  body('bursary.discountUgx').if((_v, { req }) => req.body.isBursary === true || req.body.isBursary === 'true').isInt({ min: 1 }).withMessage('bursary.discountUgx must be positive'),
];

const updateValidation = [
  body('firstName').optional().trim().notEmpty().isLength({ max: 80 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 80 }),
  body('dateOfBirth').optional().isISO8601()
    .custom(val => { if (new Date(val) >= new Date()) throw new Error('dateOfBirth must be in the past'); return true; }),
  body('gender').optional().isIn(['Male', 'Female']),
  body('section').optional().isIn(['Day', 'Boarding']),
];

// ── Routes (order matters — specific before :id) ──────────────

// GET /api/v1/pupils
router.get('/', PupilController.listPupils);

// GET /api/v1/pupils/guardian-check?phone=+256...
router.get('/guardian-check', PupilController.guardianCheck);

// GET /api/v1/pupils/export
router.get('/export', requireRole('system_admin', 'bursar'), PupilController.exportPupils);

// GET /api/v1/pupils/family/:guardianId
router.get('/family/:guardianId', PupilController.getPupilFamily);

// POST /api/v1/pupils
router.post('/', requireRole('system_admin', 'bursar'),
  multerUpload.single('photo'), registerValidation, PupilController.registerPupil);

// GET /api/v1/pupils/:id
router.get('/:id', PupilController.getPupilById);

// PUT /api/v1/pupils/:id
router.put('/:id', requireRole('system_admin', 'bursar'), updateValidation, PupilController.updatePupil);

// DELETE /api/v1/pupils/:id
router.delete('/:id', requireRole('system_admin'), PupilController.deletePupil);

// POST /api/v1/pupils/:id/photo
router.post('/:id/photo', requireRole('system_admin', 'bursar'),
  multerUpload.single('photo'), PupilController.uploadPhoto);

export default router;
