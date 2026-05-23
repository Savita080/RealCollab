import express from 'express';
import { getProjectActivity } from '../controllers/activitycontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router({ mergeParams: true });

router.get('/', protectRoute, getProjectActivity);

export default router;
