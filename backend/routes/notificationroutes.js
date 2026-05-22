import express from 'express';
import { createNotification, getUnreadNotifications } from '../controllers/notificationcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/', protectRoute, createNotification);

router.get('/unread', protectRoute, getUnreadNotifications);

export default router;
