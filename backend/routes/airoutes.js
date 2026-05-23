import express from 'express';
import { reviewCode, generateStandup, summarizeProject, generateTasks, findBottlenecks } from '../controllers/aicontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/review-code', protectRoute, reviewCode);
router.post('/standup', protectRoute, generateStandup);
router.post('/summarize-project', protectRoute, summarizeProject);
router.post('/generate-tasks', protectRoute, generateTasks);
router.post('/bottleneck', protectRoute, findBottlenecks);

export default router;
