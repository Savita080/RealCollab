import express from 'express';
import { getWorkspaceActivity } from '../controllers/activitycontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/activity
router.get('/', protectRoute, requireRole('VIEWER'), getWorkspaceActivity);

export default router;
