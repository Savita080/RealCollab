import express from 'express';
import { createWhiteboard, getProjectWhiteboards, deleteWhiteboard } from '../controllers/whiteboardcontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router({ mergeParams: true });

router.post('/', protectRoute, createWhiteboard);
router.get('/', protectRoute, getProjectWhiteboards);
router.delete('/:whiteboardId', protectRoute, deleteWhiteboard);

export default router;
