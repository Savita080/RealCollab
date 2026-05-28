import express from 'express';
import {
    sendMessage,
    getProjectMessages,
    reactToProjectMessage,
    editProjectMessage,
    deleteProjectMessage,
    markProjectChatRead,
    togglePinProjectMessage,
    searchProjectMessages,
} from '../controllers/chatcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';
import { resolveProject } from '../middleware/resolveProject.js';

const router = express.Router({ mergeParams: true });
router.use(resolveWorkspace, resolveProject);

router.post('/', protectRoute, requireProjectRole('VIEWER'), sendMessage);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectMessages);
router.get('/search', protectRoute, requireProjectRole('VIEWER'), searchProjectMessages);
router.post('/read', protectRoute, requireProjectRole('VIEWER'), markProjectChatRead);
router.post('/:messageId/react', protectRoute, requireProjectRole('VIEWER'), reactToProjectMessage);
router.patch('/:messageId', protectRoute, requireProjectRole('VIEWER'), editProjectMessage);
router.delete('/:messageId', protectRoute, requireProjectRole('VIEWER'), deleteProjectMessage);
router.post('/:messageId/pin', protectRoute, requireProjectRole('VIEWER'), togglePinProjectMessage);

export default router;
