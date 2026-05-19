import express from 'express';
import { createWorkspace, getUserWorkspaces, deleteWorkspace, updateWorkspace } from '../controllers/workspacecontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.post('/', protectRoute, createWorkspace);
router.get('/', protectRoute, getUserWorkspaces);

router.patch('/:workspaceId', protectRoute, requireRole('OWNER'), updateWorkspace);
router.delete('/:workspaceId', protectRoute, requireRole('OWNER'), deleteWorkspace);

export default router;
