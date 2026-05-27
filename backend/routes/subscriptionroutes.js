import express from 'express';
import { createOrder, verifyPayment, cancelSubscription, getSubscriptionStatus } from '../controllers/subscriptioncontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { resolveWorkspace } from '../middleware/resolveWorkspace.js';

const router = express.Router();
router.param('workspaceId', resolveWorkspace);

router.post('/:workspaceId/subscribe', protectRoute, requireRole('OWNER'), createOrder);
router.post('/:workspaceId/verify', protectRoute, requireRole('OWNER'), verifyPayment);
router.post('/:workspaceId/cancel', protectRoute, requireRole('OWNER'), cancelSubscription);
router.get('/:workspaceId/subscription', protectRoute, requireRole('VIEWER'), getSubscriptionStatus);

export default router;
