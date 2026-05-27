import express from 'express';
import { sendMessage, getProjectMessages, reactToProjectMessage } from '../controllers/chatcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';
import { resolveProject } from '../middleware/resolveProject.js';

const router = express.Router({ mergeParams: true });
router.use(resolveWorkspace, resolveProject);

router.post('/', protectRoute, requireProjectRole('VIEWER'), sendMessage);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectMessages);
router.post('/:messageId/react', protectRoute, requireProjectRole('VIEWER'), reactToProjectMessage);

export default router;
