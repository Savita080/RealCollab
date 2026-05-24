import Notification from '../models/notification.js';
import redis from '../config/redis.js';

// This function gets called when someone tags a user in a comment
export const createNotification = async (req, res) => {
    try {
        const { recipientId, type, content, link } = req.body;

        // Flowchart Step 1: Backend saves message -> writes notification row (seen: false, notified: false)
        const notification = await Notification.create({
            recipient: recipientId,
            sender: req.userId, // We get this from our protectRoute middleware
            type,
            content,
            link
        });

        // Flowchart Step 2: Backend checks Redis -> user:online exists?
        if (redis) {
            const socketId = await redis.get(`user:online:${recipientId}`);
            
            if (socketId) {
                // Flowchart Step 3 (YES): io.to(socketId).emit(...)
                req.io.to(socketId).emit('new_notification', notification);
                
                // Flowchart Step 4: DB updated -> notified: true
                notification.notified = true;
                await notification.save();
                
                console.log(`[Notification] Live ping sent to user ${recipientId}`);
            } else {
                // Flowchart Step 3 (NO): Row stays in DB (notified: false)
                console.log(`[Notification] User ${recipientId} is offline. Saved to DB.`);
            }
        }

        res.status(201).json({ message: "Notification processed", notification });

    } catch (error) {
        console.error("Error triggering notification:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getUnreadNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            recipient: req.userId,
            seen: false
        }).sort('-createdAt');

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
