import express from 'express';
import { createWhiteboard, getProjectWhiteboards, deleteWhiteboard } from '../controllers/whiteboardcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), createWhiteboard);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectWhiteboards);
router.delete('/:whiteboardId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteWhiteboard);

export default router;
