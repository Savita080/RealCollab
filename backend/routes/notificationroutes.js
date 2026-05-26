import express from 'express';
import { createNotification, getUnreadNotifications, markNotificationsRead, markOneNotificationRead } from '../controllers/notificationcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/', protectRoute, createNotification);

router.get('/unread', protectRoute, getUnreadNotifications);
router.patch('/mark-read', protectRoute, markNotificationsRead);
router.patch('/:id/read', protectRoute, markOneNotificationRead);

export default router;
