/**
 * Pupil routes — /api/v1/pupils
 *
 * Route ordering matters: specific paths (export, contact-person-check, family/:id)
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
  body('houseId').optional({ checkFalsy: true }).isUUID().withMessage('houseId must be a valid UUID'),
  // Contact person (required)
  body('contactPerson.fullName').trim().notEmpty().withMessage('contactPerson.fullName is required'),
  body('contactPerson.relationship').trim().notEmpty().withMessage('contactPerson.relationship is required'),
  body('contactPerson.primaryPhone').notEmpty().matches(ugandaPhone).withMessage('contactPerson.primaryPhone must be +256XXXXXXXXX'),
  body('contactPerson.secondaryPhone').optional({ nullable: true, checkFalsy: true }).matches(ugandaPhone).withMessage('contactPerson.secondaryPhone must be +256XXXXXXXXX'),
  body('contactPerson.whatsappIndicator').optional().isIn(['primary', 'secondary', 'none']),
  // Mother (optional)
  body('mother.phone').optional({ nullable: true, checkFalsy: true }).matches(ugandaPhone).withMessage('mother.phone must be +256XXXXXXXXX'),
  // Father (optional)
  body('father.phone').optional({ nullable: true, checkFalsy: true }).matches(ugandaPhone).withMessage('father.phone must be +256XXXXXXXXX'),
  // Bursary (conditional)
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
  body('houseId').optional({ checkFalsy: true }).isUUID().withMessage('houseId must be a valid UUID'),
];

// ── Routes (order matters — specific before :id) ──────────────

// GET /api/v1/pupils
router.get('/', PupilController.listPupils);

// GET /api/v1/pupils/contact-person-check?phone=+256...
router.get('/contact-person-check', PupilController.contactPersonCheck);

// GET /api/v1/pupils/export
router.get('/export', requireRole('system_admin', 'bursar'), PupilController.exportPupils);

// GET /api/v1/pupils/family/:contactPersonId
router.get('/family/:contactPersonId', PupilController.getPupilFamily);

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
