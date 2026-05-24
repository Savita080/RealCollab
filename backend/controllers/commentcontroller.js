import TaskComment from '../models/taskComment.js';
import User from '../models/user.js';
import Notification from '../models/notification.js';
import redis from '../config/redis.js';

export const createComment = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        const newComment = await TaskComment.create({
            task: taskId,
            author: req.userId,
            content
        });

        // Fetch the created comment and populate author so the live event has the name/avatar
        const populatedComment = await TaskComment.findById(newComment._id).populate('author', 'name avatar');

        if (req.body.projectId) {
            req.io.to(req.body.projectId).emit('task_comment_added', populatedComment);
        }

        // Parse @mentions and notify each mentioned user
        const mentionedNames = [...content.matchAll(/@(\w+)/g)].map(m => m[1]);
        if (mentionedNames.length > 0) {
            const mentionedUsers = await User.find({
                name: { $in: mentionedNames.map(n => new RegExp(`^${n}$`, 'i')) }
            }).select('_id name');

            for (const mentionedUser of mentionedUsers) {
                if (mentionedUser._id.toString() === req.userId) continue;

                const notification = await Notification.create({
                    recipient: mentionedUser._id,
                    sender: req.userId,
                    type: 'MENTION',
                    content: `mentioned you in a comment: "${content.slice(0, 80)}${content.length > 80 ? '…' : ''}"`,
                    link: `/tasks/${taskId}`
                });

                if (redis) {
                    const socketId = await redis.get(`user:online:${mentionedUser._id}`);
                    if (socketId) {
                        req.io.to(socketId).emit('new_notification', notification);
                        notification.notified = true;
                        await notification.save();
                    }
                }
            }
        }

        res.status(201).json({ message: "Comment added", comment: populatedComment });
    } catch (error) {
        console.error("Error adding comment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getTaskComments = async (req, res) => {
    try {
        const { taskId } = req.params;
        // Populate the author so the frontend gets their name and avatar
        const comments = await TaskComment.find({ task: taskId })
            .populate('author', 'name avatar')
            .sort('createdAt');
            
        res.status(200).json({ comments });
    } catch (error) {
        console.error("Error fetching comments:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const deletedComment = await TaskComment.findByIdAndDelete(commentId);
        
        if (!deletedComment) {
            return res.status(404).json({ message: "Comment not found" });
        }
        
        // Make the deletion LIVE too!
        if (req.body.projectId) {
            req.io.to(req.body.projectId).emit('task_comment_deleted', { 
                commentId, 
                taskId: deletedComment.task 
            });
        }
        
        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        console.error("Error deleting comment:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
