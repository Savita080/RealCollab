import express from 'express';
import { getProjectActivity } from '../controllers/activitycontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireProjectRole } from '../middleware/rbac.js';

const router = express.Router({ mergeParams: true });

router.get('/', protectRoute, requireProjectRole('VIEWER'), getProjectActivity);

export default router;
