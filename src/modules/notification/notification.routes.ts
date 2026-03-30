import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as notificationController from './notification.controller.js';

const router = Router();

router.get('/', authenticate, notificationController.getNotifications);
router.get('/unread-count', authenticate, notificationController.getUnreadCount);
router.patch('/read-all', authenticate, notificationController.markAllAsRead);
router.patch('/:id/read', authenticate, notificationController.markAsRead);

export default router;
