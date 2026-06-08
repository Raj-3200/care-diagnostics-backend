import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { getLab, updateLab } from './settings.controller.js';
import { updateLabSettingsSchema } from './settings.validators.js';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/lab', (req, res, next) => void getLab(req, res, next));
router.patch('/lab', validate(updateLabSettingsSchema), (req, res, next) =>
  void updateLab(req, res, next),
);
router.get('/billing', (req, res, next) => void getLab(req, res, next));

export default router;
