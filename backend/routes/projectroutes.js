import express from 'express';
import { 
    createProject, getWorkspaceProjects, updateProject, deleteProject,
    getProjectMembers, addProjectMember, removeProjectMember
} from '../controllers/projectcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireRole('MEMBER'), createProject);
router.get('/', protectRoute, requireRole('VIEWER'), getWorkspaceProjects);
router.patch('/:projectId', protectRoute, requireRole('ADMIN'), updateProject);
router.delete('/:projectId', protectRoute, requireRole('ADMIN'), deleteProject);

router.get('/:projectId/members', protectRoute, requireRole('VIEWER'), getProjectMembers);
router.post('/:projectId/members', protectRoute, requireRole('ADMIN'), addProjectMember);
router.delete('/:projectId/members/:userId', protectRoute, requireRole('ADMIN'), removeProjectMember);

export default router;
