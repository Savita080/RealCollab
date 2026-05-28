import express from 'express';
import { getUnreadCounts } from '../controllers/chatcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();
router.get('/unread', protectRoute, getUnreadCounts);

export default router;
