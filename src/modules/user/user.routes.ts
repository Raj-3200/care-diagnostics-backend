import { Router } from 'express';
import * as userController from './user.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { createUserSchema, updateUserSchema, paginationSchema } from './user.validators.js';
import { Role } from '@prisma/client';

const router = Router();

// All user routes require admin authentication
router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.post(
  '/',
  validate(createUserSchema),
  (req, res, next) => void userController.createUser(req, res, next),
);
router.get(
  '/',
  validate(paginationSchema, 'query'),
  (req, res, next) => void userController.getAllUsers(req, res, next),
);
router.get('/:id', (req, res, next) => void userController.getUserById(req, res, next));
router.patch(
  '/:id',
  validate(updateUserSchema),
  (req, res, next) => void userController.updateUser(req, res, next),
);
router.delete('/:id', (req, res, next) => void userController.deleteUser(req, res, next));

export default router;
