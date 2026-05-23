import express from 'express';
import { sendMessage, getProjectMessages } from '../controllers/chatcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, sendMessage);
router.get('/', protectRoute, getProjectMessages);

export default router;
