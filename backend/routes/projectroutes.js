import express from 'express';
import { createProject, getWorkspaceProjects, updateProject, deleteProject } from '../controllers/projectcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireRole('MEMBER'), createProject);
router.get('/', protectRoute, requireRole('VIEWER'), getWorkspaceProjects);
router.patch('/:projectId', protectRoute, requireRole('ADMIN'), updateProject);
router.delete('/:projectId', protectRoute, requireRole('ADMIN'), deleteProject);

export default router;
