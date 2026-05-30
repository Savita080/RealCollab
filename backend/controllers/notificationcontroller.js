import Notification from '../models/notification.js';
import User from '../models/user.js';

export const getUnreadNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.userId,
            seen: false
        })
            .populate('sender', 'name avatar')
            .sort('-createdAt');

        res.status(200).json({ notifications });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const markNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.userId, seen: false },
            { $set: { seen: true } }
        );
        res.status(200).json({ message: "Notifications marked as read" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const markOneNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Notification.updateOne(
            { _id: id, recipient: req.userId },
            { $set: { seen: true } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Notification not found" });
        }
        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Return the VAPID public key so the frontend can subscribe
export const getVapidPublicKey = (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// Save a new push subscription for this user's device
export const subscribePush = async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription?.endpoint) {
            return res.status(400).json({ message: "Invalid subscription object" });
        }
        const user = await User.findById(req.userId);
        // Avoid storing duplicate endpoints
        const already = user.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
        if (!already) {
            user.pushSubscriptions.push(subscription);
            await user.save();
        }
        res.json({ message: "Push subscription saved" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Remove a push subscription (user disabled notifications in browser)
export const unsubscribePush = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const user = await User.findById(req.userId);
        user.pushSubscriptions = user.pushSubscriptions.filter(s => s.endpoint !== endpoint);
        await user.save();
        res.json({ message: "Push subscription removed" });
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};
