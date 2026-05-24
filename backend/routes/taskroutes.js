import express from 'express';
import { createTask, getProjectTasks, updateTask, deleteTask } from '../controllers/taskcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireProjectRole('CONTRIBUTOR'), createTask);
router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectTasks);
router.patch('/:taskId', protectRoute, requireProjectRole('CONTRIBUTOR'), updateTask);
router.delete('/:taskId', protectRoute, requireProjectRole('CONTRIBUTOR'), deleteTask);

export default router;
