import express from 'express';
import { createWhiteboard, getProjectWhiteboards, updateWhiteboard, deleteWhiteboard } from '../controllers/whiteboardcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { checkLimit } from '../middleware/planLimits.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), checkLimit('whiteboards'), createWhiteboard);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectWhiteboards);
router.patch('/:whiteboardId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateWhiteboard);
router.delete('/:whiteboardId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteWhiteboard);

export default router;
