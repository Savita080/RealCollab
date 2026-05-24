import express from 'express';
import { 
    createWorkspace, getUserWorkspaces, updateWorkspace, deleteWorkspace, 
    generateInvite, acceptInvite, getWorkspaceMembers, updateMemberRole, removeMember,
    transferOwnership
} from '../controllers/workspacecontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { checkWorkspaceLimit } from '../middleware/planLimits.js';
import { sendWorkspaceMessage, getWorkspaceMessages } from '../controllers/workspacechatcontroller.js';


const router = express.Router();

router.post('/', protectRoute, checkWorkspaceLimit, createWorkspace);
router.get('/', protectRoute, getUserWorkspaces);

router.patch('/:workspaceId', protectRoute, requireRole('OWNER'), updateWorkspace);
router.delete('/:workspaceId', protectRoute, requireRole('OWNER'), deleteWorkspace);
router.patch('/:workspaceId/transfer-ownership', protectRoute, requireRole('OWNER'), transferOwnership);

router.post('/:workspaceId/invite', protectRoute, requireRole('ADMIN'), generateInvite);
router.post('/invite/accept/:token', protectRoute, acceptInvite);

router.get('/:workspaceId/members', protectRoute, requireRole('VIEWER'), getWorkspaceMembers);
router.patch('/:workspaceId/members/:userId/role', protectRoute, requireRole('ADMIN'), updateMemberRole);
router.delete('/:workspaceId/members/:userId', protectRoute, requireRole('ADMIN'), removeMember);

// Workspace Global Chat
router.post('/:workspaceId/chat', protectRoute, requireRole('MEMBER'), sendWorkspaceMessage);
router.get('/:workspaceId/chat', protectRoute, requireRole('VIEWER'), getWorkspaceMessages);

export default router;
