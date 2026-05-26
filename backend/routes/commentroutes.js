import express from 'express';
import { createComment, getTaskComments, deleteComment, reactToComment } from '../controllers/commentcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

// mergeParams: true allows us to access the :taskId from the parent router in main.js
const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, createComment);
router.get('/', protectRoute, getTaskComments);
router.delete('/:commentId', protectRoute, deleteComment);
router.post('/:commentId/react', protectRoute, reactToComment);

export default router;
