import { Router } from 'express';
import * as healthController from './health.controller.js';

const router = Router();

router.get('/', (req, res, next) => void healthController.healthCheck(req, res, next));

export default router;
