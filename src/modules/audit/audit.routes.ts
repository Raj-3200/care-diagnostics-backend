import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { getAuditLogs } from './audit.controller.js';
import { auditLogListSchema } from './audit.validators.js';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.ADMIN));

router.get('/', validate(auditLogListSchema, 'query'), (req, res, next) =>
  void getAuditLogs(req, res, next),
);

export default router;
