import express from 'express';
import {
    createProject, getProject, getWorkspaceProjects, updateProject, deleteProject,
    getProjectMembers, addProjectMember, removeProjectMember
} from '../controllers/projectcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole, requireProjectRole, requireProjectCreator } from '../middleware/rbac.js';
import { checkLimit } from '../middleware/planLimits.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireRole('MEMBER'), checkLimit('projects'), createProject);
router.get('/', protectRoute, requireRole('VIEWER'), getWorkspaceProjects);
router.get('/:projectId', protectRoute, requireProjectRole('VIEWER'), getProject);
router.patch('/:projectId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateProject);
router.delete('/:projectId', protectRoute, requireRole('VIEWER'), requireProjectCreator, deleteProject);

router.get('/:projectId/members', protectRoute, requireProjectRole('VIEWER'), getProjectMembers);
router.post('/:projectId/members', protectRoute, requireProjectRole('CONTRIBUTOR'), addProjectMember);
// Removal is locked to the project creator (or workspace OWNER/ADMIN) — contributors
// can ADD teammates but NOT kick them. Prevents "rogue contributor" abuse.
// Self-removal is always allowed (anyone can leave a project they're in).
const allowSelfRemoval = (req, res, next) => {
    if (req.params.userId === req.userId) return next();
    return requireProjectCreator(req, res, next);
};
router.delete('/:projectId/members/:userId', protectRoute, requireRole('VIEWER'), allowSelfRemoval, removeProjectMember);

export default router;
