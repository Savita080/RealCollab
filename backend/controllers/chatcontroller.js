import ProjectMessage from '../models/projectMessage.js';
import Project from '../models/project.js';
import Workspace from '../models/workspace.js';
import { notifyMentions, notifyUser } from '../utils/notify.js';
import { toggleReaction } from '../utils/reactions.js';

// Populate shape used everywhere — sender + the quoted parent (sender + content).
// Reply previews need just enough to render the quote chip, not the full thread.
const REPLY_POPULATE = { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'name' } };

export const sendMessage = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { content, replyTo } = req.body;

        if (!content) return res.status(400).json({ message: "Message content is required" });

        // Validate replyTo belongs to the same project — prevents cross-channel quoting.
        let validReplyTo = null;
        if (replyTo) {
            const parent = await ProjectMessage.findById(replyTo).select('project').lean();
            if (parent && parent.project.toString() === projectId) validReplyTo = replyTo;
        }

        const newMessage = await ProjectMessage.create({
            project: projectId,
            sender: req.userId,
            content,
            replyTo: validReplyTo,
        });

        // Populate sender info + replyTo preview for the frontend UI
        const populatedMessage = await ProjectMessage.findById(newMessage._id)
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE);

        // Make it LIVE! Broadcast to everyone in the project room
        req.io.to(projectId).emit('new_group_message', populatedMessage);

        // Build the access-scoped recipient set: project members + workspace OWNER/ADMIN.
        // We don't notify random workspace users on a project-scoped @mention.
        const project = req.project || await Project.findById(projectId).select('members workspace slug').lean();
        const projMemberIds = (project?.members || []).map(m => m.user.toString());
        const workspace = await Workspace.findById(project?.workspace || req.params.workspaceId).select('members slug').lean();
        const wsAdminIds = (workspace?.members || [])
            .filter(m => m.role === 'OWNER' || m.role === 'ADMIN')
            .map(m => m.user.toString());
        const allowedUserIds = [...new Set([...projMemberIds, ...wsAdminIds])];

        // Notify @mentioned users (scoped to project members + ws admins)
        const senderName = populatedMessage.sender?.name || 'Someone';
        const snippet = content.slice(0, 80) + (content.length > 80 ? '…' : '');
        const wsSlug = workspace?.slug || req.params.workspaceId;
        const projSlug = project?.slug || projectId;
        const chatLink = `/workspaces/${wsSlug}/projects/${projSlug}/chat`;
        notifyMentions(req.io, {
            content,
            sender: req.userId,
            type: 'MENTION',
            link: chatLink,
            contentBuilder: () => `${senderName} mentioned you in chat: "${snippet}"`,
            allowedUserIds,
        }).catch(err => console.error('[chat mentions] failed:', err.message));

        // Notify the user being replied to (skip if they were already @-mentioned)
        if (validReplyTo) {
            const parentSender = populatedMessage.replyTo?.sender?._id;
            if (parentSender) {
                notifyUser(req.io, {
                    recipient: parentSender,
                    sender: req.userId,
                    type: 'MENTION',
                    content: `${senderName} replied to you: "${snippet}"`,
                    link: chatLink,
                }).catch(err => console.error('[chat reply notify] failed:', err.message));
            }
        }

        res.status(201).json({ message: "Message sent", chatMessage: populatedMessage });
    } catch (error) {
        console.error("Error sending message:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const reactToProjectMessage = async (req, res) => {
    try {
        const { projectId, messageId } = req.params;
        const { emoji } = req.body;
        const reactions = await toggleReaction(ProjectMessage, messageId, emoji, req.userId);
        req.io.to(projectId).emit('message_reaction_updated', {
            scope: 'project',
            messageId,
            reactions,
        });
        res.status(200).json({ reactions });
    } catch (err) {
        console.error('Error toggling project message reaction:', err.message);
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
    }
};

export const getProjectMessages = async (req, res) => {
    try {
        const { projectId } = req.params;
        const messages = await ProjectMessage.find({ project: projectId })
            .populate('sender', 'name avatar')
            .populate(REPLY_POPULATE)
            .sort('createdAt'); // Oldest first (like normal chat history)

        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
