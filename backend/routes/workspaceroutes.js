import express from 'express';
import { 
    createWorkspace, getUserWorkspaces, updateWorkspace, deleteWorkspace, 
    generateInvite, acceptInvite, getWorkspaceMembers, updateMemberRole, removeMember 
} from '../controllers/workspacecontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';


const router = express.Router();

router.post('/', protectRoute, createWorkspace);
router.get('/', protectRoute, getUserWorkspaces);

router.patch('/:workspaceId', protectRoute, requireRole('OWNER'), updateWorkspace);
router.delete('/:workspaceId', protectRoute, requireRole('OWNER'), deleteWorkspace);

router.post('/:workspaceId/invite', protectRoute, requireRole('ADMIN'), generateInvite);
router.post('/invite/accept/:token', protectRoute, acceptInvite);

router.get('/:workspaceId/members', protectRoute, requireRole('VIEWER'), getWorkspaceMembers);
router.patch('/:workspaceId/members/:userId/role', protectRoute, requireRole('ADMIN'), updateMemberRole);
router.delete('/:workspaceId/members/:userId', protectRoute, requireRole('ADMIN'), removeMember);
export default router;
