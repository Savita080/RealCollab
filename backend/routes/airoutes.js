import express from 'express';
import { reviewCode, generateStandup, summarizeProject, generateTasks, findBottlenecks } from '../controllers/aicontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { checkAIQuota } from '../middleware/planLimits.js';
import { injectWorkspaceFromProject } from '../middleware/injectWorkspaceFromProject.js';

const router = express.Router();

router.post('/review-code', protectRoute, injectWorkspaceFromProject, checkAIQuota, reviewCode);
router.post('/standup', protectRoute, injectWorkspaceFromProject, checkAIQuota, generateStandup);
router.post('/summarize-project', protectRoute, injectWorkspaceFromProject, checkAIQuota, summarizeProject);
router.post('/generate-tasks', protectRoute, injectWorkspaceFromProject, checkAIQuota, generateTasks);
router.post('/bottleneck', protectRoute, injectWorkspaceFromProject, checkAIQuota, findBottlenecks);

export default router;
