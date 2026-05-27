import express from 'express';
import { getWorkspaceActivity } from '../controllers/activitycontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';

const router = express.Router({ mergeParams: true });

// :workspaceId comes from the mount path, so router.param won't fire.
// Run the resolver as plain middleware instead.
router.use(resolveWorkspace);

// GET /api/workspaces/:workspaceId/activity
router.get('/', protectRoute, requireRole('VIEWER'), getWorkspaceActivity);

export default router;
