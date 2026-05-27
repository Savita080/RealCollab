import express from 'express';
import { getProjectActivity } from '../controllers/activitycontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';
import { resolveProject } from '../middleware/resolveProject.js';

const router = express.Router({ mergeParams: true });
router.use(resolveWorkspace, resolveProject);

// GET /api/workspaces/:workspaceId/projects/:projectId/activity
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectActivity);

export default router;
