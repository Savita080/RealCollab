import express from 'express';
import { createWorkspace, getUserWorkspaces } from '../controllers/workspacecontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/', protectRoute, createWorkspace);
router.get('/', protectRoute, getUserWorkspaces);

export default router;
