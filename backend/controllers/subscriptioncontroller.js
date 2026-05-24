import Razorpay from 'razorpay';
import crypto from 'crypto';
import Workspace from '../models/workspace.js';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const PRO_AMOUNT = 49900; // ₹499 in paise

export const createOrder = async (req, res) => {
    try {
        const workspace = req.workspace;

        if (workspace.subscription.plan === 'PRO') {
            return res.status(400).json({ message: "Workspace is already on Pro plan" });
        }

        const order = await razorpay.orders.create({
            amount: PRO_AMOUNT,
            currency: 'INR',
            receipt: `ws_${Date.now()}`,
            notes: {
                workspaceId: req.params.workspaceId,
                userId: req.userId
            }
        });

        res.status(200).json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error("Error creating order:", JSON.stringify(error));
        res.status(500).json({ error: "Failed to create payment order" });
    }
};

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment verification fields" });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ error: "Invalid payment signature" });
        }

        const workspace = req.workspace;
        workspace.subscription.plan = 'PRO';
        workspace.subscription.razorpaySubscriptionId = razorpay_payment_id;
        // Set PRO access for 1 year (hackathon demo — no recurring billing needed)
        const periodEnd = new Date();
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        workspace.subscription.currentPeriodEnd = periodEnd;
        await workspace.save();

        res.status(200).json({
            message: "Payment verified. Workspace upgraded to Pro!",
            plan: 'PRO',
            currentPeriodEnd: workspace.subscription.currentPeriodEnd
        });
    } catch (error) {
        console.error("Error verifying payment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const cancelSubscription = async (req, res) => {
    try {
        const workspace = req.workspace;

        if (workspace.subscription.plan !== 'PRO') {
            return res.status(400).json({ message: "No active Pro subscription" });
        }

        workspace.subscription.plan = 'FREE';
        workspace.subscription.razorpaySubscriptionId = null;
        workspace.subscription.currentPeriodEnd = null;
        await workspace.save();

        res.status(200).json({ message: "Subscription cancelled. Workspace downgraded to Free." });
    } catch (error) {
        console.error("Error cancelling subscription:", error.message);
        res.status(500).json({ error: "Failed to cancel subscription" });
    }
};

export const getSubscriptionStatus = async (req, res) => {
    try {
        const workspace = req.workspace;

        res.status(200).json({
            plan: workspace.subscription.plan,
            currentPeriodEnd: workspace.subscription.currentPeriodEnd,
            aiRequestsUsed: workspace.subscription.aiRequestsUsed,
            aiRequestsResetAt: workspace.subscription.aiRequestsResetAt
        });
    } catch (error) {
        console.error("Error fetching subscription status:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
