import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { loginSchema, refreshSchema } from './auth.validators.js';

const router = Router();

// Strict rate limit for auth endpoints to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10, // 10 attempts per window
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  (req, res, next) => void authController.login(req, res, next),
);
router.post(
  '/refresh',
  validate(refreshSchema),
  (req, res, next) => void authController.refresh(req, res, next),
);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, (req, res, next) => void authController.me(req, res, next));

export default router;
