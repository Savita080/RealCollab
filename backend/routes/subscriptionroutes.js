import express from 'express';
import { createOrder, verifyPayment, cancelSubscription, getSubscriptionStatus } from '../controllers/subscriptioncontroller.js';
import { protectRoute } from '../middleware/authmiddleware.js';

const router = express.Router();

// Subscription is per-user now — no workspace context required.
router.post('/subscribe', protectRoute, createOrder);
router.post('/verify',    protectRoute, verifyPayment);
router.post('/cancel',    protectRoute, cancelSubscription);
router.get('/status',     protectRoute, getSubscriptionStatus);

export default router;
