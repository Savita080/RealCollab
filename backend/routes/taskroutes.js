import express from 'express';
import { createTask, getProjectTasks, updateTask, deleteTask } from '../controllers/taskcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, requireRole('MEMBER'), createTask);
router.get('/', protectRoute, requireRole('VIEWER'), getProjectTasks);
router.patch('/:taskId', protectRoute, requireRole('MEMBER'), updateTask);
router.delete('/:taskId', protectRoute, requireRole('MEMBER'), deleteTask);

export default router;
