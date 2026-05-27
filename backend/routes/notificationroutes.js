import express from 'express';
import { createNotification, getUnreadNotifications, markNotificationsRead, markOneNotificationRead, getVapidPublicKey, subscribePush, unsubscribePush } from '../controllers/notificationcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/', protectRoute, createNotification);

router.get('/unread', protectRoute, getUnreadNotifications);
router.patch('/mark-read', protectRoute, markNotificationsRead);
router.patch('/:id/read', protectRoute, markOneNotificationRead);

// Web Push
router.get('/vapid-public-key', getVapidPublicKey);
router.post('/push/subscribe', protectRoute, subscribePush);
router.post('/push/unsubscribe', protectRoute, unsubscribePush);

export default router;
