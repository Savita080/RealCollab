// utils/notify.js — single source of truth for creating notifications and pushing them live
import Notification from '../models/notification.js';
import User from '../models/user.js';
import redis from '../config/redis.js';

/**
 * Create a notification and push live to recipient if online.
 * @param {Object} io       Socket.IO server instance
 * @param {Object} opts
 * @param {String} opts.recipient   userId being notified
 * @param {String} [opts.sender]    userId of the actor
 * @param {String} opts.type        MENTION | PROJECT_ASSIGN | ROLE_CHANGE
 * @param {String} opts.content     human-readable message
 * @param {String} [opts.link]      navigation hint when clicked
 */
export async function notifyUser(io, { recipient, sender, type, content, link }) {
    if (!recipient) return null;
    // Don't notify yourself
    if (sender && recipient.toString() === sender.toString()) return null;

    try {
        const notification = await Notification.create({
            recipient,
            sender,
            type,
            content,
            link,
        });

        // Populate sender for the live payload (so frontend toast can show the name/avatar)
        const populated = sender
            ? await Notification.findById(notification._id).populate('sender', 'name avatar')
            : notification;

        if (redis && io) {
            const socketId = await redis.get(`user:online:${recipient}`);
            if (socketId) {
                io.to(socketId).emit('new_notification', populated);
                notification.notified = true;
                await notification.save();
            }
        }
        return populated;
    } catch (err) {
        console.error('[notifyUser] failed:', err.message);
        return null;
    }
}

/**
 * Parse @mentions from `content`, look up users by name (case-insensitive),
 * and notify each one. Returns the list of matched user ids (excluding the sender).
 *
 * Matching: a token like "@Suhani" matches a user whose full name is "Suhani"
 * OR whose name starts with "Suhani " (i.e. first word match). This way the
 * autocomplete can insert just the first name without breaking match.
 */
export async function notifyMentions(io, { content, sender, type, link, contentBuilder, allowedUserIds }) {
    if (!content) return [];
    const names = [...content.matchAll(/@([\w.-]+)/g)].map(m => m[1]);
    if (names.length === 0) return [];

    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const orClauses = [];
    for (const n of names) {
        const e = escape(n);
        // Full-name match OR first-word match ("Suhani" matches "Suhani Sharma")
        orClauses.push({ name: new RegExp(`^${e}$`, 'i') });
        orClauses.push({ name: new RegExp(`^${e}\\s`, 'i') });
    }
    const users = await User.find({ $or: orClauses }).select('_id name');

    // Optional access scope: only notify users present in the allowedUserIds set.
    // Used for project-scoped chats so a project-viewer mention doesn't ping users
    // who can't see the channel.
    const allowSet = allowedUserIds
        ? new Set(allowedUserIds.map(id => id.toString()))
        : null;

    const notified = [];
    const seen = new Set();
    for (const u of users) {
        const idStr = u._id.toString();
        if (seen.has(idStr)) continue;
        seen.add(idStr);
        const senderStr = sender?.toString();
        if (senderStr && idStr === senderStr) continue;
        if (allowSet && !allowSet.has(idStr)) continue;
        await notifyUser(io, {
            recipient: u._id,
            sender,
            type: type || 'MENTION',
            content: typeof contentBuilder === 'function' ? contentBuilder(u) : content,
            link,
        });
        notified.push(u._id);
    }
    return notified;
}
