import express from 'express';
import { sendMessage, getProjectMessages } from '../controllers/chatcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), sendMessage);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectMessages);

export default router;
