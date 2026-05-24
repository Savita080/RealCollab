import express from 'express';
import { 
    createProject, getWorkspaceProjects, updateProject, deleteProject,
    getProjectMembers, addProjectMember, removeProjectMember
} from '../controllers/projectcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole, requireProjectRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireRole('MEMBER'), createProject);
router.get('/', protectRoute, requireRole('VIEWER'), getWorkspaceProjects);
router.patch('/:projectId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateProject);
router.delete('/:projectId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteProject);

router.get('/:projectId/members', protectRoute, requireProjectRole('VIEWER'), getProjectMembers);
router.post('/:projectId/members', protectRoute, requireProjectRole('CONTRIBUTOR'), addProjectMember);
router.delete('/:projectId/members/:userId', protectRoute, requireProjectRole('CONTRIBUTOR'), removeProjectMember);

export default router;
