/**
 * Class hierarchy routes.
 *
 * classGroupRouter     → /api/v1/admin/class-groups      (system_admin)
 * classSubGroupRouter  → /api/v1/admin/class-sub-groups  (system_admin)
 * classHierarchyRouter → /api/v1/admin/class-hierarchy   (all authenticated)
 */

import { Router }        from 'express';
import { body, param }   from 'express-validator';
import { authenticate }  from '../middleware/auth.js';
import { requireRole }   from '../middleware/rbac.js';
import * as HierarchyCtrl from '../controllers/ClassHierarchyController.js';

// ── Class groups router ────────────────────────────────────────

export const classGroupRouter = Router();
classGroupRouter.use(authenticate);
classGroupRouter.use(requireRole('system_admin'));

const groupCreateValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('name is required')
    .isLength({ max: 80 }).withMessage('name max 80 chars'),
  body('displayOrder')
    .notEmpty().withMessage('displayOrder is required')
    .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
];

const groupUpdateValidation = [
  param('id').isUUID().withMessage('Invalid class group ID'),
  body('name')
    .optional().trim()
    .isLength({ min: 1, max: 80 }).withMessage('name max 80 chars'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
];

classGroupRouter.get('/',    HierarchyCtrl.listClassGroups);
classGroupRouter.post('/',   groupCreateValidation, HierarchyCtrl.createClassGroup);
classGroupRouter.put('/:id', groupUpdateValidation, HierarchyCtrl.updateClassGroup);
classGroupRouter.delete('/:id',
  param('id').isUUID().withMessage('Invalid class group ID'),
  HierarchyCtrl.deleteClassGroup,
);

// ── Class sub-groups router ────────────────────────────────────

export const classSubGroupRouter = Router();
classSubGroupRouter.use(authenticate);
classSubGroupRouter.use(requireRole('system_admin'));

const subGroupCreateValidation = [
  body('classGroupId')
    .notEmpty().isUUID().withMessage('classGroupId must be a valid UUID'),
  body('name')
    .trim()
    .notEmpty().withMessage('name is required')
    .isLength({ max: 80 }).withMessage('name max 80 chars'),
  body('displayOrder')
    .notEmpty().withMessage('displayOrder is required')
    .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
];

const subGroupUpdateValidation = [
  param('id').isUUID().withMessage('Invalid class sub-group ID'),
  body('name')
    .optional().trim()
    .isLength({ min: 1, max: 80 }).withMessage('name max 80 chars'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 }).withMessage('displayOrder must be a non-negative integer')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean')
    .toBoolean(),
];

classSubGroupRouter.get('/',    HierarchyCtrl.listClassSubGroups);
classSubGroupRouter.post('/',   subGroupCreateValidation, HierarchyCtrl.createClassSubGroup);
classSubGroupRouter.put('/:id', subGroupUpdateValidation, HierarchyCtrl.updateClassSubGroup);
classSubGroupRouter.delete('/:id',
  param('id').isUUID().withMessage('Invalid class sub-group ID'),
  HierarchyCtrl.deleteClassSubGroup,
);

// ── Class hierarchy router (all authenticated) ─────────────────

export const classHierarchyRouter = Router();
classHierarchyRouter.use(authenticate);
classHierarchyRouter.get('/', HierarchyCtrl.getClassHierarchy);
